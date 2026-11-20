# Spec Delta

## Purpose

Gets users from the home screen to a ready camera in one step, using the platform's app-icon shortcuts.

## ADDED Requirements

### Requirement: Home-screen shortcuts
Long-pressing the app icon on Android and iOS SHALL offer "Scan", which opens the Scan tab with the camera active, and "Basket", which opens the Scan tab in basket mode. "Basket" SHALL be offered only when basket mode exists in the build.

#### Scenario: Scan shortcut from a cold start
- **WHEN** the app is not running and the user picks "Scan" from the icon menu
- **THEN** the app opens straight to the Scan tab with the camera active, skipping any other screen except the first-run intro

#### Scenario: Basket shortcut while running
- **WHEN** the app is in the background on Profile and the user picks "Basket"
- **THEN** the app shows the Scan tab with basket mode on
