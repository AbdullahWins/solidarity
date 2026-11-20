# Tasks

## 1. Rules test harness

- [x] 1.1 Add the dev dependency `@firebase/rules-unit-testing` (the Firebase CLI is used from the global install), add an `emulators.firestore` block to `firebase.json`, and add an npm script `test:rules` (`scripts/test-rules.mjs`, which picks a Java 21 runtime) that runs `jest --config jest.rules.config.js` inside `firebase emulators:exec`. Verify that `npm run test:rules` starts the emulator and runs an empty suite.
- [x] 1.2 Write `rules/__tests__/legacy.test.ts` cases (replaying `legacyClient.ts`) for the current (old-client) vote flow: cast, change, retract and account-deletion transactions. Verify they pass against the current rules, which gives the compatibility baseline.

## 2. Firestore rules

- [x] 2.1 Tighten `countryTallies/{key}`: the count change must equal the caller's voter-doc change in the same request (design D2, including the clamp at zero). Verify that the 1.2 old-client tests still pass and that new tests for a forged delta, a delta without a voter write, and an unverified user are denied.
- [x] 2.2 Add rules for `aggregates/countryTallies`: public read; updates that change one key, mirrored from the per-country tally (D3); and the stale-only reconcile claim and create (D4). Verify with emulator tests: a mirrored vote is allowed, a mismatched entry is denied, a two-key change is denied, a claim inside 23 hours is denied, and a claim after 23 hours is allowed.

## 3. Tallies client

- [x] 3.1 In `lib/votes.ts`, read the aggregate doc in `getAllTallies`, raise `CACHE_TTL_MS` to 3 hours, and keep the stale-cache fallback. Verify with emulator tests that a fresh aggregate is used without per-country reads, and a jest test (mocked Firestore) for the 3-hour cache and that a failed read returns the cached tallies.
- [x] 3.2 Implement the reconcile claim and per-key repair (D4). Verify with emulator tests that a missing or stale aggregate is rebuilt from the per-country tallies (including votes from old app versions), and that signed-out clients read without writing.
- [x] 3.3 Extend `castVote`, `retractVote` and `deleteAllVotesForUser` to write the aggregate entry in the same transaction, and skip it when the aggregate is absent (D5). Verify with emulator tests that run the real client functions against the new rules, and that aggregate and tally are equal after each operation.

## 4. Leaderboard and sync

- [x] 4.1 In `lib/cloudSync.ts`: a top 50, a 30-minute memory and AsyncStorage cache, `force` with a 60-second throttle, patching the own row in `pushSummary` and removing it on opt-out, and clearing the cache in `resetSync`. Raise `MIN_SYNC_INTERVAL_MS` to 15 minutes. Verify with jest tests for cache hit, expiry, the throttle and the own-row patch.
- [x] 4.2 Update `app/(tabs)/leaderboard.tsx` so focus uses the cache and pull-to-refresh forces a fetch. Verify in demo mode on web that the list renders and that refreshing works.

## 5. Docs, verification and rollout

- [x] 5.1 Add `aggregates/countryTallies` to the README collections table, along with the rules-deploy-first note. Verify by reading the README.
- [x] 5.2 Run `npm run verify` and `npm run test:rules`. Verify that both pass.
- [x] 5.3 Deploy the rules (`npx firebase deploy --only firestore`) before releasing the app, after confirming with the owner. Deployed to solidarity-nadesoft on 2026-11-21 (compiled and released). Still worth confirming a vote from the 1.1.0 store build succeeds.
