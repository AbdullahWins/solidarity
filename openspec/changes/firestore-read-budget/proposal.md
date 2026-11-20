# Proposal

## Why

The app runs on Firebase's free Spark plan with no billing account. Firestore reads are capped at 50,000 a day, and a typical active user now costs about 320 of them: fetching vote tallies reads every per-country document (~110), and the leaderboard reads 100 rows on every tab visit with no cache. That caps the app at roughly 150 daily active users, and when the quota runs out, votes, the leaderboard and sync stop working until midnight Pacific. We want the free plan to carry as many users as possible, using Firebase only (no Cloud Functions, no other services).

## What Changes

- All country vote counts are also kept in **one aggregate document**, and the app reads that single document instead of ~110 per-country documents.
- Per-country tally documents stay as the source of truth. Every vote updates the voter record, the per-country tally and the aggregate in one transaction. Older app versions keep working unchanged.
- The aggregate is created and kept in step by the app itself. If it is missing, or hasn't been reconciled for 24 hours, one client re-reads the per-country tallies and corrects any entries that drifted (for example, votes cast from older app versions). Across all users, that costs about 110 reads a day.
- Firestore rules get stricter. A tally change must match the voter record written in the same request, and an aggregate entry must equal its per-country tally. Clients can no longer set arbitrary counts.
- The tally cache lasts 3 hours instead of 45 minutes. Pull-to-refresh still fetches fresh counts.
- The leaderboard shows the **top 50** instead of the top 100. It is cached for 30 minutes on the device, and the user's own row updates locally after a sync. Pull-to-refresh fetches fresh data at most once a minute.
- Background progress sync writes at most every 15 minutes while the app is open (was 5), and still flushes when the app goes to the background.
- Account deletion also removes the user's votes from the aggregate.

## Capabilities

### New Capabilities
- `community-voting`: country vote tallies. Covers how votes are counted, how the public counts are read and kept consistent, how fresh they are, and compatibility with older app versions.

### Modified Capabilities
- `accounts-privacy`: the leaderboard shows the top 50 entries with bounded freshness, and account deletion also covers the aggregate counts.

## Impact

- Code: `lib/votes.ts` (aggregate read, reconcile, three-way vote transaction, deletion), `lib/cloudSync.ts` (leaderboard cache, top 50, sync interval), `app/(tabs)/leaderboard.tsx` (cached load, throttled refresh), `hooks/useCloudSync.ts` (keeps the cached own row up to date).
- Firestore: new document `aggregates/countryTallies`. Rules in `firestore.rules` change and must be deployed **before** the new app version ships. The new rules accept writes from both old and new clients.
- Docs: the README collections table gets the new document. The privacy policy needs no change, because the aggregate holds the same anonymous counts as today.
- Free-tier capacity: from about 150 to roughly 1,500–3,000 daily active users. Writes per day become the limiting quota.
