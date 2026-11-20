# Proposal

## Why

A scan currently tells the user only which country a barcode is registered to. People think in products, not prefixes: "Is *this* chocolate OK?". Showing the product name, brand and photo makes the result trustworthy, because the user can confirm it read the right item, and it makes History searchable. Open Food Facts is a free, open product database with no API key and no account, so this adds real value without Firebase or any cost.

## What Changes

- After a scan, the app can look up the barcode in **Open Food Facts** and show the product name, brand and a small photo on the result. The verdict never waits for it: it shows instantly and the product details fill in when they arrive.
- **Off by default.** The first time a result is shown, a one-line inline prompt asks "Show product names? Sends the barcode to Open Food Facts". The choice is saved, and Settings has a toggle to change it.
- Found products are cached on the device, so a repeat scan shows them instantly and offline. Products that weren't found are cached for a shorter time.
- The product name and brand are saved on the scan record, so History shows them and can search them.
- A "Not the right product?" link opens the product's Open Food Facts page in the in-app browser, where anyone can correct it. Attribution reads "Product data: Open Food Facts (ODbL)".
- Only the barcode number is sent. Nothing identifying the user is sent, apart from the IP address that any web request exposes.

## Capabilities

### New Capabilities
- `product-lookup`: optional product name, brand and photo for scanned barcodes from Open Food Facts, with consent, caching and attribution.

### Modified Capabilities
<!-- app-website "Accurate privacy policy" already requires the policy to match; this change updates the policy text, not the requirement. -->

## Impact

- New: `lib/productLookup.ts` (fetch with a timeout, parsing, cache), `hooks/useProductLookup.ts`, `components/scanner/ProductRow.tsx`.
- Modified: the result card in `components/scanner/ScanScreen.tsx`, `lib/types.ts` (optional `productName` and `brand` on `ScanRecord`), `lib/preferences.ts` (`productLookup: "unset" | "on" | "off"`), the Settings toggle, History rows.
- External service: `https://world.openfoodfacts.org/api/v2/product/{code}` (public, no key). The request carries a generic app `User-Agent` with the website URL, as OFF's usage policy asks, and no personal contact details.
- Compliance: the privacy policy (what is sent, to whom, when, and that it's optional), the Play Console Data safety answers, and the support FAQ.
- Depends on `simple-navigation` (result card layout).
