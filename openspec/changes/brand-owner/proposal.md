# Proposal

## Why

The verdict is based on where a barcode was registered, which often isn't who profits from the sale. Open Food Facts records the brand owner (parent company) for many products. Showing it next to the brand tells users who is actually behind the product, which is the information the app exists to provide.

## What Changes

- When product names are on, the lookup also requests the brand owner and the product's categories (categories are used by `product-alternatives`).
- The result shows **"Owned by <company>"** under the brand when Open Food Facts knows it and it differs from the brand. History rows show it too, and History search matches it.
- Owner and categories are saved on the scan record and included in backups.
- The product cache moves to a new key, so previously cached products are fetched again once and gain owner data.

## Capabilities

### New Capabilities
<!-- none -->

### Modified Capabilities
- `product-lookup`: "Product details on the result and in History" also covers the brand owner.

## Impact

- Code: `lib/productLookup.ts` (fields, parsing, cache key), `components/scanner/ProductRow.tsx`, `lib/types.ts` (`owner`, `categories`), `lib/storage.ts` (`updateScan` patch fields), `lib/historyFilter.ts` (search), History rows, `lib/backup.ts` (validation), basket items.
- Privacy: no change to what is sent (still only the barcode). The privacy policy's description of what's shown gains "owner".
