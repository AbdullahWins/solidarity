# Spec Delta

## ADDED Requirements

### Requirement: Bounded leaderboard reads
The leaderboard SHALL show at most the top 50 opted-in users by XP. The app SHALL reuse a leaderboard cached on the device for up to 30 minutes. Pull-to-refresh SHALL fetch fresh data, but at most once a minute. After the user's own progress syncs, or they opt in or out, their own row SHALL show the change without a refetch.

#### Scenario: Revisiting the tab
- **WHEN** the user opens the Leaderboard tab within 30 minutes of the last fetch
- **THEN** the cached list is shown and no Firestore read is made

#### Scenario: Opting in
- **WHEN** a verified user turns on "Show me on the public leaderboard" and opens the Leaderboard
- **THEN** their own row is present, provided their XP places them in the top 50

#### Scenario: Repeated pull-to-refresh
- **WHEN** the user pulls to refresh twice within a minute
- **THEN** only the first pull reads from Firestore

### Requirement: Bounded progress sync writes
While the app is in the foreground, the progress backup and leaderboard row SHALL be written at most once every 15 minutes, and only when local progress has changed. Pending changes SHALL be written when the app goes to the background.

#### Scenario: Scanning session
- **WHEN** a user scans ten products over five minutes and then leaves the app
- **THEN** progress is written at most twice: once at the first change and once when the app goes to the background
