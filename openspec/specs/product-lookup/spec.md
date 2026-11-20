# product-lookup Specification

## Purpose
Shows the product name, brand and photo for a scanned barcode from the open Open Food Facts database, only with the user's consent, without slowing the verdict, and with correct attribution.

## Requirements

### Requirement: Consent before any lookup
The app SHALL NOT send a barcode to Open Food Facts until the user has turned product names on. The first result shown while the choice is unset SHALL include a prompt explaining that the barcode is sent to Open Food Facts, with options to turn it on or decline. Settings SHALL let the user change the choice at any time.

#### Scenario: First scan
- **WHEN** a user who hasn't chosen yet sees a result
- **THEN** the prompt is shown and no lookup request has been made

#### Scenario: Declined
- **WHEN** the user declines
- **THEN** no lookup request is made for any later scan until they turn it on in Settings

### Requirement: Verdict never waits for the lookup
The verdict and country SHALL be shown as soon as the barcode is read, regardless of the lookup. Product details SHALL appear when they arrive. A lookup that fails or takes longer than 4 seconds SHALL be abandoned without an error dialog.

#### Scenario: Slow network
- **WHEN** the lookup has not answered after 4 seconds
- **THEN** the result stays as it is, with a quiet "Product details unavailable" line

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

### Requirement: Local cache
Found products SHALL be cached on the device for at least 30 days, and not-found results for 7 days. A cached barcode SHALL be shown without a network request.

#### Scenario: Repeat scan offline
- **WHEN** the user rescans a previously found product with no connection
- **THEN** the cached name, brand and photo are shown

### Requirement: Attribution and correction
Wherever product details appear, the app SHALL credit "Open Food Facts (ODbL)" and SHALL offer a link to the product's Open Food Facts page.

#### Scenario: Wrong product shown
- **WHEN** the user taps "Not the right product?"
- **THEN** the product's Open Food Facts page opens in the in-app browser

### Requirement: Minimal data sent
A lookup request SHALL contain only the barcode and a generic app identifier. It SHALL NOT contain account, device, location or scan-history data.

#### Scenario: Inspecting a request
- **WHEN** a lookup request is captured
- **THEN** its URL contains only the barcode and requested fields, and its headers contain no user identifiers
