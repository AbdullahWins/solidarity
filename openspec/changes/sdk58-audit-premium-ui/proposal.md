# Proposal

## Why

Play Console flagged release 18 (1.0.2) for three things: manual bitmap decoding, an R8 config that disables optimisation, and a required `android.hardware.screen.portrait` feature that blocks installs on tablets, desktops and Android XR. The app is also two SDKs behind (Expo 54 → 58). A full audit found several correctness and privacy bugs, and the UI is phone-portrait only and visually plain.

## What Changes

- Upgrade to Expo SDK 58 (React Native 0.88, React 19.3), align every Expo-managed package with `expo install --fix`, upgrade Firebase JS SDK to 13, and get `expo-doctor` to a clean pass.
- Remove unused or now-vendored dependencies (`react-native-webview`, `expo-symbols`, `@react-navigation/*`, `expo-module-scripts`). Add `expo-image` and `expo-linear-gradient`.
- Android store compliance:
  - drop the portrait lock (no implied `screen.portrait` feature) and mark camera hardware as optional;
  - switch release builds to the optimising R8 config (`proguard-android-optimize.txt`) with resource shrinking;
  - render every bitmap through `expo-image` (downsampling, caching), and ship correctly sized in-app images.
- Fix breaking SDK 58 API changes: `expo-media-library` legacy save now throws at runtime; `app.json` `newArchEnabled` is no longer a valid key.
- Bug fixes from the audit:
  - auth session is now persisted across restarts (React Native AsyncStorage persistence);
  - UPC-A (12-digit) barcodes were looked up with the wrong GS1 prefix; codes are now normalised to GTIN-13 and check digits validated;
  - QR codes were accepted as product barcodes; removed;
  - the positive/negative haptics were inverted;
  - double-submits from the camera's continuous callbacks;
  - streak reminder fired every day even when the user had already scanned;
  - Firestore `users` collection was listable by any signed-in user, exposing non-opted-in users' vote choices and activity; leaderboard moves to a minimal public `leaderboard/{uid}` collection;
  - account deletion left the user's votes in the public tallies and could half-fail on `requires-recent-login`; it now re-authenticates, retracts votes, deletes vote records, the leaderboard entry and the user document, then the auth user;
  - add password reset.
- **BREAKING (backend):** new Firestore rules and the `leaderboard` collection must be deployed together with this release.
- Premium, responsive UI: new design tokens, gradient hero surfaces, animated scanner viewfinder with torch, adaptive layouts for phone/tablet in portrait and landscape (bottom tab bar on compact widths, side navigation rail on wide/landscape), multi-column grids on large screens.
- Static website in `website/` (home, privacy, terms, support, account deletion, 404) with GitHub Pages workflow, linked from Settings and the sign-up screen.

## Capabilities

### New Capabilities
- `platform-compliance`: SDK version, Android manifest/hardware features, R8 and image-loading requirements for store builds.
- `barcode-scanning`: how barcodes are captured, validated, mapped to a GS1 country and recorded.
- `accounts-privacy`: sign-in persistence, password reset, leaderboard data exposure and full account deletion.
- `streak-reminders`: when the daily streak reminder notification fires.
- `adaptive-ui`: layout behaviour across phone/tablet and portrait/landscape.
- `app-website`: public website pages required by the stores and their in-app links.

### Modified Capabilities
<!-- none: openspec/specs/ was empty before this change -->

## Impact

- Code: all screens in `app/`, every component in `components/`, `lib/firebase.ts`, `lib/cloudSync.ts`, `lib/votes.ts`, `lib/scan-logic.ts`, `lib/notifications.ts`, `contexts/AuthContext.tsx`, new `lib/gtin.ts`, `hooks/useLayout.ts`.
- Config: `app.json`, `package.json`, new config plugins `plugins/withAndroidStoreCompliance.js`, `firestore.rules`, `firestore.indexes.json`.
- Assets: regenerated icon, adaptive icon (foreground + monochrome), splash and notification icons.
- Backend: Firestore rules deploy required; existing opted-in users re-appear on the leaderboard after their next sync.
- New `website/` folder and `.github/workflows/pages.yml`.
