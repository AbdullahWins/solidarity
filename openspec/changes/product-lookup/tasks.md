# Tasks

## 1. Lookup core

- [ ] 1.1 Create `lib/productLookup.ts`: build the URL, fetch with a 4-second abort, parse found and not-found responses, and treat 429 or errors as unavailable. Verify with jest tests using mocked `fetch` for found, not found, timeout and 429.
- [ ] 1.2 Add the product cache (TTLs, a 1,000-entry cap with oldest-first eviction). Verify with jest tests for a hit, expiry and eviction.
- [ ] 1.3 Add `updateScan(id, patch)` to `lib/storage.ts` and the optional `productName` and `brand` to `ScanRecord`. Verify with a jest test that a patch updates only the given record.

## 2. Consent and UI

- [ ] 2.1 Add `preferences.productLookup`, the inline consent row on the result, and the Settings toggle. Verify on web that no OFF request is made while the choice is unset or off (network log).
- [ ] 2.2 Add `ProductRow` to the result: name, brand, `expo-image` thumbnail, the "Not the right product?" link and attribution, plus the not-found and unavailable states. Verify in demo mode with a mocked lookup for each state.
- [ ] 2.3 Show the product name in History rows, falling back to the country. Verify in the demo-mode screenshot.

## 3. Compliance and verification

- [ ] 3.1 Update `website/privacy-policy.html` (optional sharing of the barcode with Open Food Facts, the purpose, the default off setting) and the support FAQ. Note the Play Console Data safety update in the release checklist. Verify against the code, as the `app-website` spec requires.
- [ ] 3.2 Run `npm run verify` and do a manual scan of a known product on a device. Verify that the name appears and the verdict was not delayed.
