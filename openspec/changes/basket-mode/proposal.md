# Proposal

## Why

In a shop, people check several products, not one. Today each scan stops the camera and needs "Scan again", which is slow with a full cart. A basket mode that keeps scanning and builds a running list gives a summary of the whole shop ("12 items: 9 fine, 3 to avoid"), entirely on the device.

## What Changes

- A **Basket** switch on the Scan tab. In basket mode the camera keeps scanning. Each new barcode is added to a basket list with its flag, verdict colour and (if product names are on) its name, plus a short haptic.
- The same barcode scanned twice in one basket is counted once. A small "Already in basket" note appears and nothing is recorded again.
- A sticky basket bar shows live counts (Fine · Avoid · Neutral). Tapping it opens the **basket summary**: items grouped by verdict, with each item removable, and actions "Share summary" and "Finish basket".
- Basket items are normal scans: they appear in History and earn the usual XP. Finishing a basket clears the list but not the history.
- The open basket survives leaving the tab and restarting the app until it is finished. It expires after 12 hours of inactivity.

## Capabilities

### New Capabilities
- `basket-mode`: continuous multi-item scanning with a running basket, a summary and sharing.

### Modified Capabilities
- `barcode-scanning`: "Single capture per barcode" changes so that in basket mode the camera continues after a capture, while still recording each barcode at most once per basket.

## Impact

- New: `lib/basket.ts` (state, persistence, expiry), `hooks/useBasket.ts`, `components/scanner/BasketBar.tsx`, `app/basket.tsx` (summary screen).
- Modified: `components/scanner/ScanScreen.tsx` (mode switch, continuous capture, per-code cooldown), `lib/haptics.ts` (light "added" haptic).
- Sharing uses the existing `expo-sharing` and the text share sheet. There are no new dependencies.
- Uses `resolveAnswer` from `personal-country-rules` when present, otherwise the community verdict. Depends on `simple-navigation`.
