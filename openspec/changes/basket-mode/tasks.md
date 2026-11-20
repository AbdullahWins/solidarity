# Tasks

## 1. Basket state

- [ ] 1.1 Create `lib/basket.ts`: add with dedupe, remove, finish, persistence, 12-hour expiry on load, and a pure `basketShareText`. Verify with jest tests for dedupe, expiry, remove and share text (no barcodes in it).
- [ ] 1.2 Create `hooks/useBasket.ts`, which exposes counts by tone. Verify with a jest test that the counts follow add and remove.

## 2. Scanning loop

- [ ] 2.1 Add the Basket switch and the continuous-capture loop with cooldown and duplicate notice to `ScanScreen` (design D1). Verify with a jest test of the capture handler (same code twice gives one `addScan` call) and on a device with three products.
- [ ] 2.2 Add `BasketBar` (live counts, opens the summary) and the "last added" row with a 5-second undo. Verify in web demo mode with simulated captures.

## 3. Summary

- [ ] 3.1 Add the `app/basket.tsx` summary: grouped sections, remove buttons, Share, and Finish with confirmation. Verify that Finish empties the basket and leaves History unchanged.

## 4. Verification

- [ ] 4.1 Run `npm run verify`, and check on a device that an app restart restores an open basket. Verify that both pass.
