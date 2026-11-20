# Tasks

## 1. Lookup

- [ ] 1.1 Request `brand_owner` and `categories_tags` in `lib/productLookup.ts`, parse them (owner trimmed; up to 5 `en:` category tags), and move the cache to `solidarity:v2:productCache`. Verify with jest tests for parsing an owner, skipping an owner equal to the brand, and category trimming.

## 2. Records and UI

- [ ] 2.1 Add optional `owner` and `categories` to `ScanRecord`, `updateScan`, backup validation and basket items, and save them when a lookup succeeds. Verify with storage and backup jest tests.
- [ ] 2.2 Show "Owned by …" in `ProductRow` and History rows, and match owner in `filterScans`. Verify with a historyFilter test and a demo screenshot.

## 3. Docs and verification

- [ ] 3.1 Mention brand owner in the privacy policy's product-names description and the support FAQ. Verify the pages render.
- [ ] 3.2 Run `npm run verify`. Verify that it passes.
