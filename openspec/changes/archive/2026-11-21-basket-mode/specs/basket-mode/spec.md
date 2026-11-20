# Spec Delta

## Purpose

Lets a shopper scan many products in a row without stopping, and see a summary of the whole basket by verdict, entirely on the device.

## ADDED Requirements

### Requirement: Continuous basket scanning
With basket mode on, the camera SHALL keep scanning after each capture. Each new barcode SHALL be added to the basket with its country, flag and verdict, and SHALL trigger a light haptic when haptics are enabled.

#### Scenario: Three products in a row
- **WHEN** the user scans three different products in basket mode without touching the screen
- **THEN** all three appear in the basket in scan order

### Requirement: One entry per barcode per basket
A barcode already in the open basket SHALL NOT be added or recorded again. The app SHALL show a brief "Already in basket" notice instead.

#### Scenario: Rescanning an item
- **WHEN** a barcode already in the basket is scanned again
- **THEN** the basket count stays the same, no new scan record is stored, and the notice is shown

### Requirement: Live counts and summary
While a basket is open, the Scan tab SHALL show the counts of items that are fine, to avoid, and neutral (unknown or non-votable). Opening the summary SHALL list the items grouped by verdict, and SHALL let the user remove an item, share a plain-text summary, and finish the basket.

#### Scenario: Removing a mistaken scan
- **WHEN** the user removes an item from the summary
- **THEN** the counts update. The scan stays in History.

#### Scenario: Sharing
- **WHEN** the user taps "Share summary"
- **THEN** the system share sheet opens with a text listing the counts and each item's country and verdict, without barcodes

### Requirement: Basket lifetime
The open basket SHALL persist across tab switches and app restarts until it is finished, or until 12 hours after its last addition, when it SHALL be discarded. Finishing or discarding a basket SHALL NOT delete any scans from History.

#### Scenario: Reopening the app
- **WHEN** the user closes the app with an open basket and reopens it an hour later
- **THEN** the basket and its counts are restored

#### Scenario: Stale basket
- **WHEN** the app opens more than 12 hours after the basket's last addition
- **THEN** the basket is empty and basket mode is off
