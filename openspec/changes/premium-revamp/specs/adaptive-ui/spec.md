# Spec Delta

## ADDED Requirements

### Requirement: Country identity
Wherever a country is listed or shown as a result, the app SHALL display its flag next to its name. Ranges that are not countries SHALL show a neutral glyph instead.

#### Scenario: Scan result
- **WHEN** a barcode registered in Germany is scanned
- **THEN** the result shows the German flag beside "Germany"

#### Scenario: Book barcode
- **WHEN** an ISBN barcode is scanned
- **THEN** the result shows a neutral book glyph instead of a flag

### Requirement: Fast recall
The Scan screen SHALL show the most recent scans as one-tap shortcuts to their country screens.

#### Scenario: Recent scans
- **WHEN** the user has scanned products before
- **THEN** the Scan screen lists up to eight recent scans, each opening that country's screen
