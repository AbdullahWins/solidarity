# Design

## Context

Scans are parsed to GTIN-13 by `lib/gtin.ts`, then recorded by `useScanHistory.addScan`. The result card is rendered in `ScanScreen` (verdict-first after `simple-navigation`). Images must go through `expo-image` (platform-compliance). The in-app browser is `openInAppBrowser` in `lib/links.ts`.

## Goals / Non-Goals

**Goals:** an optional, fast, cached product name with no effect on scan speed.

**Non-Goals:** nutrition scores or ingredients, editing products in-app, other databases, and offline bundles of the database.

## Decisions

### D1. Endpoint and fields
`GET https://world.openfoodfacts.org/api/v2/product/{gtin}?fields=product_name,brands,image_front_small_url`. The GTIN-13 is sent as-is. `status: 0` means not found. The `User-Agent` is `Solidarity/<version> (+<website URL>)`, and on web, where the browser forbids setting `User-Agent`, it goes in OFF's `app_name` query parameter instead. No contact email is sent.
*Alternative:* also query Open Beauty Facts or Open Products Facts. Deferred: it adds requests per scan for little coverage.

### D2. Fetch lifecycle
`useProductLookup(code)` starts after the scan is saved. It uses an `AbortController` with a 4-second timeout and is cancelled when the result closes. On success it patches the stored `ScanRecord` (`productName`, `brand`) through a new `updateScan(id, patch)` in `lib/storage.ts`.

### D3. Cache
`solidarity:v1:productCache` holds `Record<gtin, { name?, brand?, image?, found, at }>`, capped at 1,000 entries and evicting the oldest first. The TTL is 30 days for found products and 7 days for not-found ones. Images use `expo-image` with `cachePolicy: "disk"`.

### D4. Consent
`preferences.productLookup` is `"unset" | "on" | "off"`, defaulting to `"unset"`. The prompt is an inline row inside the result card, not a modal, so it never blocks scanning.

## Risks / Trade-offs

- [OFF data is incomplete or wrong for non-food items] → Show it as "from Open Food Facts", never as fact, and offer the correction link.
- [OFF rate limits (about 100 product reads a minute per IP)] → Caching and one request per scan keep normal use far below that. A 429 response is treated as unavailable.
- [Privacy: OFF sees the barcode and the IP address] → Opt-in only, the privacy policy names OFF and the purpose, and the Data safety answers are updated.
