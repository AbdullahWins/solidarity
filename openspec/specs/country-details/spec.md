# country-details Specification

## Purpose
Gives every country a dedicated screen that brings together its flag, community verdict, voting, GS1 prefixes and the user's own scans.

## Requirements

### Requirement: Country screen content
The country screen SHALL show the flag and name, the community verdict with up and down counts and approval percentage, vote controls, the GS1 prefixes registered to that country, and the user's scans of that country, newest first.

#### Scenario: Country with votes and scans
- **WHEN** the user opens Portugal after scanning two Portuguese products
- **THEN** the screen shows the Portuguese flag, the tally, prefix 560 and both scans

#### Scenario: Non-votable range
- **WHEN** the screen is opened for a non-country range such as "Bookland (ISBN)"
- **THEN** it shows the prefixes and scans without vote controls, and explains why

### Requirement: Entry points
The country screen SHALL be reachable from the scan result, from every Community card, and from every Stats history row and most-scanned row.

#### Scenario: From Community
- **WHEN** the user taps a country card in Community
- **THEN** that country's screen opens
