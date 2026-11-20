# Tasks

## 1. Rules store

- [ ] 1.1 Create `lib/countryRules.ts` with load, save, a sync mirror, subscribe and `resolveAnswer`. Verify with jest tests for set, clear and clear-all, and for `resolveAnswer` precedence (rule over community, neutral for non-votable).
- [ ] 1.2 Create `hooks/useCountryRules.ts` and load the rules at startup in `app/_layout.tsx`. Verify with a jest test that a change notifies subscribers.

## 2. Scan and records

- [ ] 2.1 Add optional `rule` to `ScanRecord`, set it in `useScanHistory.addScan`, and drive the result's primary verdict and haptic from `resolveAnswer`. Verify in demo mode that a Support rule on a negative country shows "You support …" with the community line beneath.
- [ ] 2.2 Add `RuleSwitch` to the result's Details area and to `app/country/[name].tsx`. Verify that toggling saves offline and updates the open result immediately.

## 3. History, Community, Settings

- [ ] 3.1 Colour History rows by `rule ?? isPositive`. Verify that the demo-mode History shows rule colours for ruled scans.
- [ ] 3.2 Add the rule marker to Community cards and the "My rules" filter chip. Verify that the filter lists only ruled countries.
- [ ] 3.3 Add the `app/rules.tsx` My rules screen (list, remove, clear all with confirm) and an entry row in Settings. Verify the empty state after clear all.

## 4. Docs and verification

- [ ] 4.1 Add "Your country rules" to the on-device rows of the privacy policy table in `website/privacy-policy.html`. Verify that the page renders the row.
- [ ] 4.2 Run `npm run verify`, and check with a network log on web that no request contains rule data. Verify that both pass.
