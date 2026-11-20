# platform-compliance Specification

## Purpose
Keeps store builds installable on every supported device class, efficient in memory, and compliant with Google Play and App Store technical requirements.

## Requirements

### Requirement: Supported SDK
The app SHALL build on Expo SDK 58, and `expo-doctor` SHALL report no failed checks.

#### Scenario: Doctor passes
- **WHEN** `npx expo-doctor` runs in the project root
- **THEN** every check passes

### Requirement: No restrictive hardware features
The Android manifest SHALL NOT require `android.hardware.screen.portrait`, `android.hardware.screen.landscape` or any camera hardware feature. The app SHALL support every orientation.

#### Scenario: Tablet without rear camera
- **WHEN** a user on a tablet, Chromebook or Android XR device opens the store listing
- **THEN** the app is installable, and barcodes can still be entered manually

#### Scenario: Rotation
- **WHEN** the device rotates to landscape
- **THEN** the app rotates and re-lays out without losing state

### Requirement: Optimised release builds
Android release builds SHALL be minified and resource-shrunk with R8 optimisation enabled (no `-dontoptimize` from the default non-optimising ProGuard file).

#### Scenario: Release gradle config
- **WHEN** `expo prebuild` generates `android/app/build.gradle`
- **THEN** the release build type references `proguard-android-optimize.txt` and minification and resource shrinking are enabled

### Requirement: Managed image loading
Every raster image shown in the app SHALL be rendered through an image-loading library that downsamples to the view size and caches decoded bitmaps. Bundled in-app images SHALL NOT exceed four times their largest display size in pixels.

#### Scenario: Logo in header
- **WHEN** the header logo renders at 28 dp
- **THEN** it is decoded from an asset of at most 128 px through the image library

### Requirement: iOS submission readiness
The iOS build SHALL declare purpose strings for camera and photo-library-add access, declare `ITSAppUsesNonExemptEncryption = false`, include a privacy manifest covering required-reason APIs, support all iPad orientations, and use a 1024 px opaque app icon.

#### Scenario: Prebuild Info.plist
- **WHEN** `expo prebuild --platform ios` runs
- **THEN** Info.plist contains `NSCameraUsageDescription`, `NSPhotoLibraryAddUsageDescription` and `ITSAppUsesNonExemptEncryption` set to NO, and the privacy manifest lists the UserDefaults, file-timestamp, system-boot-time and disk-space reasons

### Requirement: Platform-correct store links
Rate and share actions SHALL link to the store for the running platform. Where no App Store listing exists yet, iOS SHALL link to the app website instead.

#### Scenario: Rate on iOS
- **WHEN** an iOS user taps "Rate the app"
- **THEN** the App Store review page opens if an App Store ID is configured, otherwise the website opens
