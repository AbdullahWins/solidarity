# adaptive-ui Specification

## Purpose
Ensures the interface is comfortable on phones and tablets in both portrait and landscape, with a consistent premium dark visual language.

## Requirements

### Requirement: Adaptive navigation
In compact portrait windows (width < 700 dp and width < height), navigation SHALL be a bottom tab bar. In wide windows or landscape windows, navigation SHALL be a vertical side rail.

#### Scenario: Phone landscape
- **WHEN** a phone rotates to landscape
- **THEN** the tab bar becomes a side rail and content keeps its full height

#### Scenario: Tablet portrait
- **WHEN** the app runs on a tablet in portrait
- **THEN** navigation is a side rail and content is centred with a readable maximum width

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
