# Proposal

## Why

Several small gaps make the app feel less finished than it is. Users without an account lose everything when they change phones. History can't be searched. Opening the scanner takes several taps from the home screen. Screen-reader users get no spoken result. The "registered, not made in" caveat is a single grey line that many miss, though it is the most important thing to understand about the verdict. None of these need a server.

## What Changes

- **"What this barcode means" sheet**: a tappable info icon on the result opens a short, plain explanation. The prefix shows where the barcode was registered with GS1, not where the product was made or who owns the brand, and the sheet gives examples and links to GS1's own explanation.
- **Backup without an account**: Settings → "Export my data" writes a JSON file (scans, progress, personal rules, preferences) and opens the share sheet. "Import data" picks such a file and merges it into the device after a preview and confirmation.
- **History search and filters**: a search field (country, product name, barcode digits) and filter chips (Fine / Avoid / Neutral, and date range: Today, 7 days, 30 days, All).
- **Home-screen shortcut**: long-pressing the app icon offers "Scan" (opens the camera) and "Basket" (opens the scanner in basket mode).
- **Accessibility cues**: screen readers announce each result ("Germany. Community says avoid."), and in basket mode each addition. Haptics use distinct patterns: one tap for fine, two taps for avoid.

## Capabilities

### New Capabilities
- `data-portability`: export and import of on-device data as a file.
- `scan-history`: searching and filtering the scan history.
- `quick-actions`: home-screen shortcuts into scanning.

### Modified Capabilities
- `barcode-scanning`: adds the barcode-meaning explainer and spoken results. "Result feedback" haptics become distinct patterns.

## Impact

- New dependencies: `expo-file-system` (write the export file), `expo-document-picker` (choose the import file), `expo-quick-actions` (home-screen shortcuts, config plugin). All support SDK 58; `expo-doctor` must stay clean.
- New: `lib/backup.ts` (serialise, validate, merge), `app/backup-preview.tsx`, `components/scanner/BarcodeInfoSheet.tsx`, `lib/historyFilter.ts`, `lib/quickActions.ts`.
- Modified: Settings ("Your data" group), History (search and filters), `ScanScreen` (info icon, announcements), `lib/haptics.ts` (patterns), `app.json` (quick-actions plugin), the support FAQ on the website.
- No backend change. The export file stays on the user's device, or goes wherever they choose to share it.
- Builds on `simple-navigation` (History screen) and is aware of `personal-country-rules`, `product-lookup` and `basket-mode`. Each feature degrades gracefully if those haven't landed: no rules exported, no product search, no Basket shortcut.
