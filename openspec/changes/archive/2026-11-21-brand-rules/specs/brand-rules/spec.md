# Spec Delta

## Purpose

Lets users avoid or support specific brands and companies, wherever their barcodes are registered, with the rule leading the scan answer and staying on the device.

## ADDED Requirements

### Requirement: Setting a brand or company rule
When a scanned product's brand or owner is known, the user SHALL be able to set Avoid, Support or no rule for that brand and for that owner from the result's details. Rules SHALL be manageable in Settings → My rules, with remove and clear-all. Setting a rule SHALL NOT require an account or a network connection.

#### Scenario: Avoiding a company
- **WHEN** the user sets Avoid on the owner shown on a result
- **THEN** the rule is saved and listed under brands in My rules

### Requirement: Brand rules lead the answer
When a scanned product's brand or owner has a rule, the result's primary verdict SHALL state that rule, ahead of any country rule and the community verdict, which SHALL be shown beneath. If the brand and owner have conflicting rules, Avoid SHALL win. When product details arrive after the result is shown and a brand rule applies, the verdict, haptic and screen-reader announcement SHALL update once.

#### Scenario: Company rule beats country
- **WHEN** the user avoids a company and scans its product whose country they support
- **THEN** the result leads with "You avoid <company>" and the country rule is shown beneath

#### Scenario: Conflict
- **WHEN** the brand is supported but its owner is avoided
- **THEN** the result leads with the Avoid rule

### Requirement: Brand rules across the app
History SHALL colour and filter scans by the brand rule that applied at scan time. Basket items SHALL take the brand rule's verdict once product details arrive.

#### Scenario: Basket update
- **WHEN** a basket item's product turns out to belong to an avoided company
- **THEN** the item moves to Avoid in the basket counts

### Requirement: Brand rules stay on the device
Brand rules SHALL be stored only on the device, SHALL NOT be sent to any server, and SHALL be included in data exports and merged on import without overwriting existing rules.

#### Scenario: Export
- **WHEN** the user exports their data
- **THEN** the file includes their brand rules
