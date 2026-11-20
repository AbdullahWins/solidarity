# Spec Delta

## MODIFIED Requirements

### Requirement: Product details on the result and in History
When a product is found, the result SHALL show its name, brand and a small photo if one exists. When Open Food Facts records a brand owner that differs from the brand, the result SHALL also show "Owned by <owner>". The name, brand and owner SHALL be stored with the scan record and shown in History, and History search SHALL match the owner.

#### Scenario: Known product
- **WHEN** a found product is scanned with product names on
- **THEN** the result shows its name and brand, and History lists the scan under that name

#### Scenario: Product with a parent company
- **WHEN** a found product's brand owner differs from its brand
- **THEN** the result shows "Owned by <owner>", and searching History for the owner finds the scan

#### Scenario: Unknown product
- **WHEN** Open Food Facts has no entry for the barcode
- **THEN** the result shows "Not in Open Food Facts yet" with a link to add it
