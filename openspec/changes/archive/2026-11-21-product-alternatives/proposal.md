# Proposal

## Why

An "avoid" result tells people what not to buy but leaves them without a next step, especially mid-shop. The products they have already scanned and found fine are the most trustworthy suggestions the app has, because the user checked them personally.

## What Changes

- When the result's verdict is **avoid** and the product's category is known, the result shows **"Instead, you've found these fine"**: up to 3 products from the user's own History in the same Open Food Facts category whose verdict was fine, newest first. Tapping one opens its country.
- If none match, nothing extra is shown.
- Suggestions come only from the device's own history: no requests, no shared lists.

## Capabilities

### New Capabilities
- `product-alternatives`: same-category, fine-verdict suggestions from the user's own history on avoid results.

### Modified Capabilities
<!-- none -->

## Impact

- New: `lib/alternatives.ts` (pure matcher), `components/scanner/AlternativesRow.tsx`.
- Modified: `components/scanner/ScanScreen.tsx` (shows the row on avoid results).
- Depends on `brand-owner` (categories on scan records) and uses `toneOf` from `lib/historyFilter.ts`.
