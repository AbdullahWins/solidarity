# Spec Delta

## ADDED Requirements

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

## MODIFIED Requirements

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
