# Design

## Context

`ScanScreen` guards captures with `lockRef` and a `scanning` flag. A capture sets both and shows the result until "Scan again" or "Scan next". `useScanHistory.addScan` records the scan and the XP. Haptics go through `lib/haptics.ts`, which respects the preference.

## Goals / Non-Goals

**Goals:** hands-free multi-item scanning, no double-recording, and a summary that is useful at checkout.

**Non-Goals:** quantities, prices, saved or named shopping lists, and syncing baskets.

## Decisions

### D1. Capture loop in basket mode
On a capture, the code is checked against `basket.codes`. A new code is recorded through `addScan` and appended, then the lock is released after a 1.2-second cooldown so the next product can be read. A known code shows a notice and also releases after the cooldown. A per-code "last seen" timestamp suppresses repeat notices while the same product stays in view. The result card is replaced by a compact "last added" row, so the camera stays visible.

### D2. State and persistence
`solidarity:v1:basket` holds `{ startedAt, lastAddedAt, items: [{ scanId, code, country, tone, productName? }] }`. Items carry the tone resolved at add time. A later vote or rule change doesn't silently move items, but the summary recomputes on open. Expiry is checked on load: if `now - lastAddedAt > 12h`, the basket is cleared.

### D3. Summary screen
`app/basket.tsx` is a modal stack route with three sections (Avoid first, then Fine, then Neutral). Swipe-free removal uses a trailing remove button, for accessibility. The share text is built by a pure function. There are no barcodes in the text, which avoids leaking purchase-level detail by accident.

### D4. XP
Each new basket item is a normal scan, so it earns normal XP. Duplicates within a basket record nothing. That is stricter than single mode, where rescanning records again, so basket mode adds no XP-farming path.

## Risks / Trade-offs

- [The camera reads a neighbouring product by accident] → The "last added" row has an undo for 5 seconds, and the summary allows removal.
- [Battery drain from continuous camera use] → Basket mode turns off when the tab loses focus (the camera is already released then). It is restored, still on, when the user returns.
