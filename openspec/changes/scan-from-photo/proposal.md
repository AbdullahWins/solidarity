# Proposal

## Why

The scanner only works on products physically in front of the camera. A lot of shopping happens online, and people also have photos of shelves or receipts with barcodes. Reading a barcode from an image lets them check those products too, using the same verdict as a live scan.

## What Changes

- A **"From photo"** action on the Scan tab opens the system file picker filtered to images (no photo-library permission is requested). The app reads the barcode from the chosen image and shows the normal result.
- If the image contains several retail barcodes, the user picks which one to check. If it contains none, the app says so and suggests a clearer photo or typing the number.
- In basket mode, a photo adds its barcode(s) to the basket, each counted once as usual.
- Photo scans are recorded with source "photo" and appear in History like any other scan.

## Capabilities

### New Capabilities
<!-- none -->

### Modified Capabilities
- `barcode-scanning`: adds scanning a barcode from an image, alongside the camera and typed entry.
- `adaptive-ui`: the Scan tab's controls under the camera become one row of three equal buttons (Basket, Photo, Type code).

## Impact

- Code: `components/scanner/ScanScreen.tsx` (action, picker, multi-barcode choice), `lib/types.ts` (`source: "photo"`), `lib/backup.ts` (accepts the new source), History and country screens (source icon).
- Uses `expo-camera`'s `scanFromURLAsync` and the already-installed `expo-document-picker`. No new dependencies or permissions.
- Images are read on the device and never uploaded or stored.
