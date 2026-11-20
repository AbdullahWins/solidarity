# barcode-scanning Specification

## Purpose
Turns a camera capture or typed code into a validated product barcode, a GS1 registration country and a stored scan record.

## Requirements

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
A barcode in view SHALL produce exactly one scan record until the user chooses to scan again. In basket mode, the camera SHALL resume after each capture, and a barcode SHALL produce at most one scan record per open basket.

#### Scenario: Continuous callbacks
- **WHEN** the camera fires several callbacks for the same code in quick succession
- **THEN** one scan record is stored

#### Scenario: Basket mode holding one product in view
- **WHEN** basket mode is on and the same product stays in front of the camera
- **THEN** one basket item and one scan record are stored

### Requirement: Result feedback
The result SHALL lead with a large verdict and the country with its flag, and SHALL offer one primary action to scan the next product. The community vote controls, the barcode number and type, and the note that the prefix shows the registration country (not the place of manufacture) SHALL be available in a secondary details area of the same result. When haptics are enabled, a positive or neutral verdict SHALL trigger a single success haptic, and a negative verdict SHALL trigger a distinct double-pulse warning pattern.

#### Scenario: Negative verdict
- **WHEN** a scanned country's community verdict is negative
- **THEN** the double-pulse warning haptic fires and the verdict line reads as a clear warning

#### Scenario: Scanning the next product
- **WHEN** the user taps "Scan next" on a result
- **THEN** the result closes and the camera is ready for the next barcode

#### Scenario: Voting from the result
- **WHEN** the user opens "Details & vote" on a result
- **THEN** the vote controls, barcode details and registration note are shown

### Requirement: Torch
The scanner SHALL offer a torch toggle.

#### Scenario: Dark aisle
- **WHEN** the user taps the torch button
- **THEN** the torch turns on until toggled off or the screen loses focus

### Requirement: Barcode meaning explainer
Every result SHALL offer an info control that opens a short explanation: the barcode prefix identifies the GS1 organisation where the barcode was registered, which is not necessarily where the product was made or who owns the brand. It SHALL include at least one example and a link to GS1's explanation.

#### Scenario: Opening the explainer
- **WHEN** the user taps the info control on a result
- **THEN** the explanation sheet opens, and closing it returns to the same result

### Requirement: Spoken results
When a screen reader is active, each new result SHALL be announced with the country and the primary verdict. In basket mode, each added item SHALL be announced with its country and verdict, and each duplicate as "already in basket".

#### Scenario: Screen reader scan
- **WHEN** a screen reader user scans a product registered in a country with a negative verdict
- **THEN** the screen reader announces "<country>. Community says avoid."

### Requirement: Scan from an image
The Scan tab SHALL offer a "From photo" action that lets the user choose an image file and checks the retail barcode found in it (EAN-13, EAN-8, UPC-A or UPC-E), with the same validation, verdict and recording as a camera scan. Choosing an image SHALL NOT require photo-library permission, and the image SHALL NOT be uploaded or kept.

#### Scenario: Screenshot of an online shop
- **WHEN** the user picks a screenshot that shows one product barcode
- **THEN** the result for that barcode is shown and the scan is recorded with source "photo"

#### Scenario: Several barcodes
- **WHEN** the chosen image contains more than one valid retail barcode
- **THEN** the user is asked which one to check, and only that one is recorded (in basket mode, each is added once)

#### Scenario: No barcode found
- **WHEN** no valid retail barcode is found in the image
- **THEN** the app explains that no barcode was found and offers to type the number instead, and nothing is recorded
