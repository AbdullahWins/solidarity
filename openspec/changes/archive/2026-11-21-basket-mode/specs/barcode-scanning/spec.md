# Spec Delta

## MODIFIED Requirements

### Requirement: Single capture per barcode
A barcode in view SHALL produce exactly one scan record until the user chooses to scan again. In basket mode, the camera SHALL resume after each capture, and a barcode SHALL produce at most one scan record per open basket.

#### Scenario: Continuous callbacks
- **WHEN** the camera fires several callbacks for the same code in quick succession
- **THEN** one scan record is stored

#### Scenario: Basket mode holding one product in view
- **WHEN** basket mode is on and the same product stays in front of the camera
- **THEN** one basket item and one scan record are stored
