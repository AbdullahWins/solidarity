# Tasks

## 1. Decoding

- [ ] 1.1 Create `lib/photoScan.ts` with `pickRetailCodes` (validate, dedupe) and `scanImage(uri)`. Verify with jest tests: invalid check digits dropped, duplicates merged, non-retail types ignored.

## 2. UI

- [ ] 2.1 Add `source: "photo"` to `ScanRecord`, accept it in backup validation, and show an image icon for it in History and on the country screen. Verify with `npm run verify` and a backup test case using "photo".
- [ ] 2.2 Add the "From photo" action to the Scan tab with the 0 / 1 / many flows (design D3), including basket mode. Verify by unit-testing the flow choice and with a web demo screenshot of the action.

## 3. Docs and verification

- [ ] 3.1 Add a support FAQ entry ("Can I check a product from a screenshot?"). Verify that the page renders.
- [ ] 3.2 Run `npm run verify`. Verify that it passes.
- [ ] 3.3 On a device: pick a screenshot with one barcode, one with two, and one with none. Verify each flow.
