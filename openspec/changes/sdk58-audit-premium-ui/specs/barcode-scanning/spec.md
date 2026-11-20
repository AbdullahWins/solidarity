# Spec Delta

## Purpose
Turns a camera capture or typed code into a validated product barcode, a GS1 registration country and a stored scan record.

## ADDED Requirements

### Requirement: Supported symbologies
The scanner SHALL accept EAN-13, EAN-8, UPC-A and UPC-E only, and SHALL ignore QR and other non-retail symbologies.

#### Scenario: QR code in view
- **WHEN** a QR code is in front of the camera
- **THEN** no scan is recorded

### Requirement: GTIN normalisation and validation
Codes SHALL be normalised to digits. 12-digit UPC-A codes SHALL be treated as GTIN-13 with a leading zero, and UPC-E codes SHALL resolve to the UPC (USA & Canada) range. The GS1 check digit SHALL be validated for 8, 12, 13 and 14-digit codes.

#### Scenario: UPC-A lookup
- **WHEN** the code `036000291452` is scanned
- **THEN** the country is resolved from GS1 prefix `003` (USA & Canada), not `036`

#### Scenario: Camera misread
- **WHEN** the camera reports a code whose check digit is invalid
- **THEN** the scan is ignored and scanning continues

#### Scenario: Manual typo
- **WHEN** the user types a code with an invalid check digit or an unsupported length
- **THEN** an inline error explains the problem and nothing is recorded

### Requirement: Single capture per barcode
A barcode in view SHALL produce exactly one scan record until the user chooses to scan again.

#### Scenario: Continuous callbacks
- **WHEN** the camera fires several callbacks for the same code in quick succession
- **THEN** one scan record is stored

### Requirement: Result feedback
The result SHALL show the country, the community verdict and vote controls. When haptics are enabled, a positive verdict SHALL trigger a success haptic and a negative verdict a warning haptic.

#### Scenario: Negative verdict
- **WHEN** a scanned country's community verdict is negative
- **THEN** a warning haptic fires

### Requirement: Torch
The scanner SHALL offer a torch toggle.

#### Scenario: Dark aisle
- **WHEN** the user taps the torch button
- **THEN** the torch turns on until toggled off or the screen loses focus
