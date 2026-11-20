# Tasks

## 1. SDK 58 upgrade and dependencies

- [x] 1.1 Upgrade to expo ~58 and run `npx expo install --fix`; verify package.json lists SDK 58 versions (RN 0.88, React 19.3)
- [x] 1.2 Remove `react-native-webview`, `expo-symbols`, `@react-navigation/*` and `expo-module-scripts`, and add `expo-image` and `expo-linear-gradient`; verify with grep that no source imports the removed packages
- [x] 1.3 Upgrade firebase to ^13; verify `tsc --noEmit` passes
- [x] 1.4 Replace `@react-navigation/native` imports with `expo-router` exports and `Tabs` with `expo-router/js-tabs`; verify by typecheck
- [x] 1.5 Fix app.json schema (remove `newArchEnabled`) and verify `npx expo-doctor` passes all checks

## 2. Store compliance (Android + iOS)

- [x] 2.1 Set `orientation: "default"` and add `plugins/withAndroidStoreCompliance.js` (optional camera/screen features, optimising R8 file); verify that the manifest from `expo prebuild` has no `screenOrientation` and has `required="false"` features, and that build.gradle uses `proguard-android-optimize.txt`
- [x] 2.2 Configure `expo-build-properties` minify and shrinkResources; verify in the generated gradle.properties
- [x] 2.3 Generate icon set (icon 1024, adaptive foreground, monochrome, notification, splash, logo 128, website images) with `scripts/generate-icons.py`; verify sizes with Pillow
- [x] 2.4 Replace every `react-native` `Image` with `expo-image` using the 128 px logo; verify with `grep "Image" -r app components` that there are no RN Image imports left
- [x] 2.5 iOS config: infoPlist encryption flag, privacy manifest, iPad orientations, buildNumber, dark UI style; verify that `expo config --type introspect` shows them
- [x] 2.6 Migrate the share-image save to `MediaLibrary.Asset.create` with write-only permission; verify by typecheck that no legacy API is used

## 3. Bug fixes and hardening

- [x] 3.1 Persist auth with `initializeAuth` + `getReactNativePersistence`; verify there is no in-memory persistence warning path
- [x] 3.2 Add `lib/gtin.ts` (normalise, check digit, country prefix) and use it in the scanner and manual entry; verify with the unit tests in `lib/__tests__/gtin.test.ts`
- [x] 3.3 Restrict symbologies to ean13/ean8/upc_a/upc_e, add a ref-based double-submit guard, fix inverted haptics and add a torch toggle; verify by code review and typecheck
- [x] 3.4 Leaderboard collection: write/delete on sync and opt-out, read from `leaderboard`; update `firestore.rules`; verified by review against every client write path (not yet compiled with the Firebase emulator; run `npx firebase deploy --only firestore` to compile)
- [x] 3.5 Account deletion with re-authentication, vote retraction, voter-doc, leaderboard and user-doc deletion; verify the flow order in `AuthContext.deleteAccount`
- [x] 3.6 Password reset on the sign-in screen and a display-name length limit; verify the UI shows the reset action
- [x] 3.7 Streak reminders rescheduled as DATE triggers skipping days with a scan; verify with the unit test for `nextReminderDates`
- [x] 3.8 Remove the leftover `scripts/reset-project.js` and the unused SpaceMono font load if unused; verify that lint passes

## 4. Premium responsive UI

- [x] 4.1 New theme tokens and `hooks/useLayout.ts` breakpoints; verify by typecheck
- [x] 4.2 Custom adaptive tab bar (bottom bar / side rail); verified via web-export renders at 390×844, 844×390, 820×1180 and 1180×820 (on-device check still recommended)
- [x] 4.3 Shared `Screen` container with safe areas, max width and refresh; adopt it on every screen
- [x] 4.4 Redesign UI primitives (Button, Card, StatTile, Badge, SegmentedControl, SearchField, TextField, EmptyState, ProgressBar, SectionHeader, VoteButtons) with press animations and accessibility roles
- [x] 4.5 Redesign Scan screen: large viewfinder with animated scan line, torch, manual entry with validation, result card; two-pane layout in landscape
- [x] 4.6 Redesign Stats, Leaderboard (podium + list), Community (multi-column FlatList), Profile (hero + badge grid), Settings (grouped lists with legal links), Auth, Not-found and the level-up modal
- [x] 4.7 Verify `npx tsc --noEmit` and `npx expo lint` pass and that the web export bundles (`npx expo export --platform web`)

## 5. Website and docs

- [x] 5.1 Build `website/` (index, privacy-policy, terms, support, delete-account, 404, style.css, images, .nojekyll) from the Step 2 data audit; verify every local link resolves with a link-check script
- [x] 5.2 Add `.github/workflows/pages.yml`; verify the YAML matches the guide
- [x] 5.3 Wire app links (Settings, sign-up consent) to `constants/app-info.ts` URLs
- [x] 5.4 Update README, PLAY_STORE_LISTING and the privacy text in Settings; bump version to 1.1.0 / versionCode 19
- [x] 5.5 Run `openspec validate sdk58-audit-premium-ui` and verify that it passes
