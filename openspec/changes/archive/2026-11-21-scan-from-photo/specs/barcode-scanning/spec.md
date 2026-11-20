# Spec Delta

## ADDED Requirements

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
