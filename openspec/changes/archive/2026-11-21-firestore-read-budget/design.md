# Design

## Context

See proposal.md (Why). Today:

- `getAllTallies()` in `lib/votes.ts` reads the whole `countryTallies` collection, which is one document per country (~110), and caches the result for 45 minutes. Signed-out users do this too.
- `castVote` and `retractVote` run a client transaction. It reads the tally and the voter doc, then writes `countryTallies/{key}` and `countryVotes/{key}/voters/{uid}`.
- The `countryTallies` rule only checks field shapes and bounds. Any verified user can set any count to any value from 0 to 100M.
- `fetchLeaderboard(100)` runs on every focus of the Leaderboard tab and on every pull-to-refresh, with no cache.
- `markDirty` in `lib/cloudSync.ts` flushes at most once every 5 minutes, and once when the app goes to the background. Each flush writes `users/{uid}` and `leaderboard/{uid}`.
- No Cloud Functions are available (they need Blaze). Everything must be client code plus Security Rules.
- Older app versions (1.1.0 and earlier) will stay installed for months. They write only the per-country tally and the voter doc.

## Goals / Non-Goals

**Goals:**
- Reading the counts costs 1 document read.
- The aggregate cannot be forged beyond what the per-country tallies allow, and the per-country tallies cannot be forged beyond one vote per user.
- Old clients keep working with no update.

**Non-Goals:**
- An aggregate leaderboard document. Rules can't verify a sorted top-N list that clients maintain, so the leaderboard stays a query, now capped and cached.
- Real-time listeners for counts.
- Migrating off the per-country tally documents. They remain the source of truth.

## Decisions

### D1. Aggregate document `aggregates/countryTallies`

Shape: `{ tallies: { [countryKey]: { country, upvotes, downvotes } }, changedKey, updatedAt, syncedAt }`.

The document lives in its own collection rather than inside `countryTallies`. Old clients read that whole collection, so a document there would cost them an extra read and show up as a fake country. At about 110 entries × ~60 bytes, it stays far below the 1 MiB document limit.

*Alternative:* one top-level field per country instead of a `tallies` map. Rejected because diffing a nested map in rules (`tallies.diff(...)`) keeps the metadata fields separate and easy to reason about.

### D2. Per-country tallies are the verifiable anchor

The `countryTallies/{key}` rule is tightened so the change in counts must equal the change in the caller's own voter document in the same request:

- `prev` is the caller's choice before the request (`get` on the voter doc). Missing or `"none"` counts as nothing.
- `next` is the caller's choice after the request (`getAfter`). A deleted doc counts as nothing.
- The expected up delta is `(next=="up") - (prev=="up")`, and likewise for down.
- The new count must equal `old + delta`. If that would go below zero, it must be 0, matching the client's existing `Math.max(0, …)` clamp.

Old clients already write the voter doc and the tally in the same transaction with exactly these semantics, so they still pass. The account-deletion path deletes the voter doc in the same transaction, so `next` is nothing and the delta is negative, which is correct. Each request makes 2 rule document lookups.

### D3. Aggregate entries must mirror the per-country tally

An update to the aggregate must name the one country it changes in `changedKey`:

- `request.resource.data.tallies.diff(resource.data.tallies).affectedKeys().hasOnly([changedKey])`.
- The new `upvotes` and `downvotes` for that key must equal `getAfter(/countryTallies/{changedKey})`.
- Only `tallies`, `changedKey` and `updatedAt` may change at the top level. `updatedAt` must be `request.time`.

Votes from new clients write all three documents in one transaction (voter, tally, aggregate), so the mirror check sees the new tally. A reconcile write copies a tally it just read, so the check passes as long as nobody voted on that country in between. If someone did, the write is rejected and the next reconcile corrects it. One key per write keeps it to a single rule lookup per request.

### D4. Bootstrap and daily reconcile, done by clients

`getAllTallies()`:
1. Read the aggregate (1 read). If it exists and `syncedAt` is less than 24 hours old, use it.
2. Otherwise, try to claim the reconcile in a transaction. Re-read the aggregate. If it is still stale or missing, set `syncedAt = request.time`, or create the doc with `tallies: {}`. The rules allow a claim only when `tallies` is unchanged and the previous `syncedAt` is more than 23 hours old (or the doc is being created with empty tallies). That stops a client from repeatedly re-claiming.
3. If this client won the claim, read the `countryTallies` collection (~110 reads) and write one aggregate update per drifted key, at most a handful a day in steady state and ~110 on the first bootstrap. Show the collection result straight away.
4. If the claim was lost to another client, just use the aggregate.

*Alternative:* trust a whole-document rebuild. Rejected because the rules couldn't verify it, and any verified user could rewrite every count.

### D5. Vote transactions

`castVote`, `retractVote` and the per-country step of `deleteAllVotesForUser` each read the voter doc, the tally and the aggregate, then write all three. If the aggregate doesn't exist yet, they skip writing it, and the reconcile adds that country. The aggregate is updated with `tx.update(ref, new FieldPath("tallies", key), {...}, "changedKey", key, "updatedAt", serverTimestamp())`. A `FieldPath` avoids parsing problems with keys like `united-kingdom`. Firestore retries a transaction automatically when it collides with another one. All votes go through one document, which is sustainable up to about 1 write per second. That is far above the expected voting rate.

### D6. Cache times and the leaderboard

- `CACHE_TTL_MS` for tallies goes from 45 minutes to 3 hours. The persisted cache keeps its key. Its shape doesn't change, because the app still exposes `Record<key, CountryTally>`.
- The leaderboard is cached in memory and in AsyncStorage (`solidarity:v1:leaderboardCache`) for 30 minutes, with a top N of 50. `fetchLeaderboard({ force })`: a forced fetch is throttled to once every 60 seconds and returns the cache when throttled.
- `pushSummary` patches the cached list after a successful leaderboard write. It upserts the user's row, re-sorts by XP and trims to 50. On opt-out it removes the row. That keeps the "opt in, then see yourself" flow without a refetch.
- The sign-out path clears the leaderboard cache along with the other per-user state.

### D7. Sync interval

`MIN_SYNC_INTERVAL_MS` goes from 5 to 15 minutes. The flush on going to the background stays. The first change in a session still pushes straight away, so the leaderboard stays reasonably fresh.

## Risks / Trade-offs

- [Rules deployed after the app ships] New clients' aggregate writes would be denied, and the whole vote transaction would fail. → Deploy rules first (task order). The new rules accept both old and new clients.
- [Do rule lookups in a transaction see the transaction's own writes? `getAfter` does by design; `get` sees the state before.] → Covered by the emulator rules tests in tasks 2.x before the deploy.
- [The rule-side clamp logic is hard to get right] → Emulator tests for cast, change, retract, retract at zero, delete, and a forged delta.
- [Reconcile lag for old clients' votes (up to 24h, plus a 3h cache)] → Acceptable. Counts are crowd sentiment, not real-time.
- [The claim's `syncedAt` can't be verified] → The worst a malicious client can do is delay the reconcile by 23 hours. It can't change any counts.
- [The leaderboard may be up to 30 minutes stale for other users' rows] → Acceptable. Pull-to-refresh covers people who want fresh data.
- [Rule lookups are billed as reads] → About 3 per vote. Votes are rare compared with screen views.

## Migration Plan

1. Run the rules emulator tests, then deploy `firestore.rules` (`npx firebase deploy --only firestore`). Current clients are unaffected.
2. Ship the app release. The first new client to launch bootstraps the aggregate (~110 reads and ~110 writes, once).
3. Rollback: revert the app. The per-country docs stayed authoritative throughout, so older builds keep working. The aggregate document can be left in place or deleted.

## Open Questions

- When to drop the dual write and the daily reconcile. Revisit once the Play Console shows usage of versions below this release as negligible. It doesn't change this design.
