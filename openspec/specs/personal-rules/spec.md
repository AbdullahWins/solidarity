# personal-rules Specification

## Purpose
Lets each user record their own Avoid or Support decision per country, so the scan answer reflects their principles first and the community verdict second, entirely on their device.

## Requirements

### Requirement: Setting a personal rule
The user SHALL be able to set Avoid, Support or no rule for any votable country, from that country's screen and from the details area of a scan result. Setting a rule SHALL NOT require an account or a network connection.

#### Scenario: Marking a country to avoid
- **WHEN** the user selects Avoid on a country's screen while offline
- **THEN** the rule is saved and the next scan from that country shows it

#### Scenario: Clearing a rule
- **WHEN** the user selects the active rule again or chooses "No rule"
- **THEN** the rule is removed and results fall back to the community verdict

### Requirement: Personal rule leads the scan answer
When a scanned country has a personal rule, the result's primary verdict SHALL state that rule, and the community verdict SHALL be shown as secondary information. When haptics are enabled, Avoid SHALL trigger a warning haptic and Support a success haptic, whatever the community verdict.

#### Scenario: Rule disagrees with the community
- **WHEN** the user has Support on a country whose community verdict is negative, and scans a product from it
- **THEN** the result leads with "You support <country>", shows the negative community verdict beneath, and a success haptic fires

#### Scenario: No rule
- **WHEN** the scanned country has no personal rule
- **THEN** the result shows the community verdict as the primary answer

### Requirement: Rules shown across the app
History entries SHALL be coloured by the personal rule that applied at scan time, when there was one. Community country cards SHALL show a marker for countries with a rule, and a "My rules" filter SHALL show only those countries.

#### Scenario: Filtering Community
- **WHEN** the user selects the "My rules" filter
- **THEN** only countries with a personal rule are listed, each showing its rule

### Requirement: Managing rules
Settings SHALL provide a screen listing every personal rule, with the option to remove each one or clear all after confirmation.

#### Scenario: Clear all
- **WHEN** the user confirms "Clear all" on the My rules screen
- **THEN** every rule is removed and the list shows an empty state

### Requirement: Rules stay on the device
Personal rules SHALL be stored only on the device. They SHALL NOT be sent to any server or included in the cloud backup, and they SHALL be kept when the user signs in or out.

#### Scenario: Signing out
- **WHEN** a signed-in user with rules signs out
- **THEN** their rules remain on the device and no network request contains them
