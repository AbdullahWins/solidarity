# adaptive-ui Specification

## Purpose
Ensures the interface is comfortable on phones and tablets in both portrait and landscape, with a consistent premium dark visual language.

## Requirements

### Requirement: Adaptive navigation
The app SHALL have exactly three primary destinations: Scan, History and Community. In compact portrait windows (width < 700 dp and width < height), they SHALL appear in a bottom tab bar. In wide windows or landscape windows, they SHALL appear in a vertical side rail. Profile SHALL open from an avatar button in the header of every primary destination, and Settings SHALL open from Profile.

#### Scenario: Phone landscape
- **WHEN** a phone rotates to landscape
- **THEN** the tab bar becomes a side rail and content keeps its full height

#### Scenario: Tablet portrait
- **WHEN** the app runs on a tablet in portrait
- **THEN** navigation is a side rail and content is centred with a readable maximum width

#### Scenario: Reaching Settings
- **WHEN** the user taps the header avatar on any tab and then Settings
- **THEN** the Settings screen opens, and going back returns to Profile and then to the tab

### Requirement: Adaptive content
Screens SHALL constrain content to a readable maximum width and SHALL use multiple columns for lists and grids when space allows. The scanner SHALL place the camera and the result side by side in landscape.

#### Scenario: Community on tablet landscape
- **WHEN** the Community tab is shown in a window at least 1000 dp wide
- **THEN** country cards render in at least three columns

### Requirement: Safe areas and accessibility
Content SHALL respect safe-area insets on all edges, including landscape notches. Interactive elements SHALL have a minimum 44 dp touch target and an accessibility label or role.

#### Scenario: Landscape notch
- **WHEN** an iPhone with a notch is in landscape
- **THEN** no content or control sits under the notch or home indicator

### Requirement: Country identity
Wherever a country is listed or shown as a result, the app SHALL display its flag next to its name. Ranges that are not countries SHALL show a neutral glyph instead.

#### Scenario: Scan result
- **WHEN** a barcode registered in Germany is scanned
- **THEN** the result shows the German flag beside "Germany"

#### Scenario: Book barcode
- **WHEN** an ISBN barcode is scanned
- **THEN** the result shows a neutral book glyph instead of a flag

### Requirement: Fast recall
The Scan screen SHALL show the most recent scans as one-tap shortcuts to their country screens.

#### Scenario: Recent scans
- **WHEN** the user has scanned products before
- **THEN** the Scan screen lists up to eight recent scans, each opening that country's screen

### Requirement: Combined History and Community destinations
History SHALL show the user's scan summary (total, positive/negative split, streak) above their scan history. Community SHALL offer a two-way switch between the country list and the leaderboard, defaulting to the country list.

#### Scenario: Opening History
- **WHEN** the user opens History with at least one scan
- **THEN** the summary is visible above the newest scans without scrolling

#### Scenario: Viewing the leaderboard
- **WHEN** the user selects "Leaderboard" in Community
- **THEN** the leaderboard is shown in place of the country list, and that choice is kept until they switch back

### Requirement: Secondary information collapsed by default
Each screen SHALL present one primary piece of information or action prominently. Secondary details SHALL be collapsed or one tap away, not shown in full by default.

#### Scenario: Scan tab at rest
- **WHEN** the Scan tab is shown with no result
- **THEN** only the camera (or permission prompt) and a "Type a code instead" link are shown
