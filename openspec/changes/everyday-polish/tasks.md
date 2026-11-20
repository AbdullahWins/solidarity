# Tasks

## 1. Barcode explainer

- [x] 1.1 Add `BarcodeInfoSheet` and an info icon on the result. Verify in a demo-mode screenshot that it opens over the result.

## 2. Backup

- [x] 2.1 Add `expo-file-system` and `expo-document-picker`. Verify with `npx expo-doctor` (no failed checks).
- [x] 2.2 Create `lib/backup.ts` (serialise, validate, merge, design D1). Verify with jest tests: round trip, idempotent re-import, rules not overwritten, progress recomputed, and rejection of a wrong file, an oversize file and an unknown version.
- [x] 2.3 Add Export and Import rows to Settings and the `app/backup-preview.tsx` confirm screen. Verify parse and merge with the 2.2 jest tests; the manual round trip is in 6.3.

## 3. History search and filters

- [x] 3.1 Create `lib/historyFilter.ts`. Verify with jest tests for query matching (country, product, digits), tone, period boundaries, and combinations.
- [x] 3.2 Add the search field, filter chips, filtered summary and empty state with "Clear filters" to History. Verify in the demo-mode screenshot with a filter applied.

## 4. Quick actions

- [x] 4.1 Add `expo-quick-actions` with its plugin in `app.json`, plus `lib/quickActions.ts` routing (Basket only when basket mode exists). Verify it builds (`npm run verify`, `expo-doctor`); device checks are in 6.3.

## 5. Accessibility cues

- [x] 5.1 Add result and basket announcements and the distinct haptic patterns in `lib/haptics.ts`. Verify it builds and the announcement text matches the spec; device checks are in 6.3.

## 6. Wrap-up

- [x] 6.1 Add backup and shortcut entries to the website support FAQ. Verify that the page renders.
- [x] 6.2 Run `npm run verify`. Verify that it passes.
- [ ] 6.3 Device checks: export on one phone and import on another (counts match, re-import adds nothing); long-press shortcuts from cold and warm starts (Basket opens with basket mode on, first-run intro still shows first); TalkBack/VoiceOver announces each result; the avoid haptic feels like two pulses.
