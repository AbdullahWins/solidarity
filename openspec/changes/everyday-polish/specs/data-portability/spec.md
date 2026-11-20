# Spec Delta

## Purpose

Lets users keep and move their on-device data (scans, progress, personal rules, preferences) between devices as a file, without an account.

## ADDED Requirements

### Requirement: Export on-device data
Settings SHALL offer "Export my data", which writes a versioned JSON file containing scan history, progress, personal rules and preferences, and opens the system share sheet. The export SHALL NOT include authentication tokens, other users' data or cached community counts.

#### Scenario: Exporting
- **WHEN** the user taps "Export my data"
- **THEN** a file named `solidarity-backup-<date>.json` is offered in the share sheet

### Requirement: Import with preview
Settings SHALL offer "Import data", which lets the user pick a backup file and shows how many scans and rules it holds before importing. Confirming SHALL merge it: scans are deduplicated by ID, rules from the file are added without overwriting existing local rules, and progress is recomputed from the merged scans, keeping the higher vote XP.

#### Scenario: Importing onto a new phone
- **WHEN** the user imports a backup on a device with no scans
- **THEN** all scans and rules from the file appear, and XP and level match the source device

#### Scenario: Importing twice
- **WHEN** the same backup is imported again
- **THEN** no duplicate scans are created

### Requirement: Reject invalid files
Import SHALL reject files that aren't a recognised backup version, are larger than 10 MB, or fail validation, with a clear message and no change to local data.

#### Scenario: Wrong file
- **WHEN** the user picks an unrelated JSON file
- **THEN** "This isn't a Solidarity backup" is shown and nothing changes
