# Tasks

## 1. Barcode explainer

- [ ] 1.1 Add `BarcodeInfoSheet` and an info icon on the result. Verify in demo mode that it opens, links to GS1, and closes back to the same result.

## 2. Backup

- [ ] 2.1 Add `expo-file-system` and `expo-document-picker`. Verify with `npx expo-doctor` (no failed checks).
- [ ] 2.2 Create `lib/backup.ts` (serialise, validate, merge, design D1). Verify with jest tests: round trip, idempotent re-import, rules not overwritten, progress recomputed, and rejection of a wrong file, an oversize file and an unknown version.
- [ ] 2.3 Add Export and Import rows to Settings and the `app/backup-preview.tsx` confirm screen. Verify with an export and then an import on web (download and file input), and that the counts shown match.

## 3. History search and filters

- [ ] 3.1 Create `lib/historyFilter.ts`. Verify with jest tests for query matching (country, product, digits), tone, period boundaries, and combinations.
- [ ] 3.2 Add the search field, filter chips, filtered summary and empty state with "Clear filters" to History. Verify in the demo-mode screenshot with a filter applied.

## 4. Quick actions

- [ ] 4.1 Add `expo-quick-actions` with its plugin in `app.json`, plus `lib/quickActions.ts` routing (Basket only when basket mode exists). Verify on an Android device build: long press shows the items, and both work from cold and warm starts.

## 5. Accessibility cues

- [ ] 5.1 Add result and basket announcements and the distinct haptic patterns in `lib/haptics.ts`. Verify with TalkBack on Android that the result is announced, and on a device that the negative pattern feels like two pulses.

## 6. Wrap-up

- [ ] 6.1 Add backup and shortcut entries to the website support FAQ. Verify that the page renders.
- [ ] 6.2 Run `npm run verify`. Verify that it passes.
