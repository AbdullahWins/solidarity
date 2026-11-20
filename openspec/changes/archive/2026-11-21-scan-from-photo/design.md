# Design

## Context

`ScanScreen.submit(rawCode, source, hint)` validates with `parseBarcode`, resolves the answer and records the scan (single or basket mode). `ScanRecord.source` is `"camera" | "manual"`. `expo-document-picker` is installed for backups.

## Decisions

### D1. Picker, not image picker
`DocumentPicker.getDocumentAsync({ type: "image/*", copyToCacheDirectory: true })`. On Android and iOS this uses the system file/photo chooser without the photo-library permission that `expo-image-picker` would add, which keeps the store listings unchanged.

### D2. Decoding
`scanFromURLAsync(uri, ["ean13", "ean8", "upc_a", "upc_e"])` (web reads the file URL too). Results are run through `parseBarcode`; invalid check digits are dropped and duplicates removed by normalised GTIN. That logic is a pure `pickRetailCodes(results)` in `lib/photoScan.ts` so it can be unit-tested.

### D3. Flow
- 0 codes: alert with "Type a code instead" as an action.
- 1 code: `submit(code, "photo", type)`.
- 2+ codes: an action sheet (Alert with one button per code, up to 4, labelled by country) in single mode; in basket mode all are submitted in sequence.

### D4. Source "photo"
Added to `ScanRecord.source`; backup validation accepts it; History and the country screen show an image icon.

## Risks / Trade-offs

- [Low-resolution screenshots don't decode] → The "no barcode" message suggests zooming in before taking the screenshot, or typing the number.
