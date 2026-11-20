# scan-history Specification

## Purpose
Makes the on-device scan history quick to search and filter, so users can find a past product or review what they scanned in a period.

## Requirements

### Requirement: Search history
History SHALL provide a search field that matches scans by country name, product name (when known) or barcode digits, case-insensitively, as the user types.

#### Scenario: Searching by product
- **WHEN** the user types "nutella" and a past scan has that product name
- **THEN** only matching scans are listed, still grouped by day

### Requirement: Filter history
History SHALL provide filters by verdict (Fine, Avoid, Neutral) and by period (Today, 7 days, 30 days, All). Filters SHALL combine with the search, and the summary SHALL describe the filtered set.

#### Scenario: Avoid in the last 7 days
- **WHEN** the user selects Avoid and 7 days
- **THEN** only avoid-verdict scans from the last 7 days are listed, and the summary counts only those

#### Scenario: No matches
- **WHEN** no scans match
- **THEN** an empty state with a "Clear filters" action is shown
