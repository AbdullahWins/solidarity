# screenshots Specification

## Purpose
Lets the owner review every screen at phone and tablet sizes, in both orientations, without building the native app.

## Requirements

### Requirement: Generated screenshot set
A single command SHALL build the web version, render every screen with deterministic demo data at phone portrait, phone landscape, tablet portrait and tablet landscape sizes, and write PNG files plus an `index.html` gallery to `Screenshots/` at the project root.

#### Scenario: Regenerate
- **WHEN** the owner runs `npm run screenshots`
- **THEN** `Screenshots/` contains one PNG per screen and device and a gallery page that opens from disk

### Requirement: Demo data isolation
Demo data SHALL only be active on web when explicitly enabled, and SHALL never be used by native builds or reach the backend.

#### Scenario: Native build
- **WHEN** the app runs on Android or iOS
- **THEN** demo mode is unavailable regardless of stored values
