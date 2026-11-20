# Spec Delta

## Purpose
Introduces new users to scanning, the community verdict and the app's privacy model before they first use the scanner.

## ADDED Requirements

### Requirement: First-run introduction
On first launch the app SHALL show a three-step introduction covering scanning, community voting and privacy. The last step SHALL offer to enable the camera and SHALL allow continuing without it. The intro SHALL be shown at most once automatically.

#### Scenario: New install
- **WHEN** the app opens for the first time with no stored scans
- **THEN** the introduction is shown before the tabs

#### Scenario: Existing user updates
- **WHEN** the app opens after an update and scans already exist on the device
- **THEN** the introduction is skipped and marked as seen

#### Scenario: Skip
- **WHEN** the user taps Skip on any step
- **THEN** the tabs open and the intro is not shown again automatically

### Requirement: Replay
Settings SHALL offer "Replay intro" to show the introduction again.

#### Scenario: Replay from Settings
- **WHEN** the user taps Replay intro
- **THEN** the introduction opens from step one
