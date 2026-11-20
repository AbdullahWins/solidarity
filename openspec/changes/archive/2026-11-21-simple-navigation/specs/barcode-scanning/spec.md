# Spec Delta

## MODIFIED Requirements

### Requirement: Result feedback
The result SHALL lead with a large verdict and the country with its flag, and SHALL offer one primary action to scan the next product. The community vote controls, the barcode number and type, and the note that the prefix shows the registration country (not the place of manufacture) SHALL be available in a secondary details area of the same result. When haptics are enabled, a positive verdict SHALL trigger a success haptic and a negative verdict a warning haptic.

#### Scenario: Negative verdict
- **WHEN** a scanned country's community verdict is negative
- **THEN** a warning haptic fires and the verdict line reads as a clear warning

#### Scenario: Scanning the next product
- **WHEN** the user taps "Scan next" on a result
- **THEN** the result closes and the camera is ready for the next barcode

#### Scenario: Voting from the result
- **WHEN** the user opens "Details & vote" on a result
- **THEN** the vote controls, barcode details and registration note are shown
