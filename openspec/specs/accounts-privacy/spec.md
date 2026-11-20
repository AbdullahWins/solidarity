# accounts-privacy Specification

## Purpose
Covers optional accounts: staying signed in, recovering access, what other users can see, and deleting every piece of server-side data tied to an account.

## Requirements

### Requirement: Persistent sign-in
A signed-in session SHALL survive app restarts.

#### Scenario: Relaunch
- **WHEN** a signed-in user force-quits and reopens the app
- **THEN** they are still signed in

### Requirement: Password reset
The sign-in screen SHALL offer a password reset that emails a reset link.

#### Scenario: Forgot password
- **WHEN** the user enters their email and taps "Forgot password?"
- **THEN** a reset email is requested and a neutral confirmation is shown whether or not the account exists

### Requirement: Minimal public leaderboard data
Other users SHALL only be able to read leaderboard entries (display name, XP, level, streaks) of users who opted in with a verified email. The full per-user progress document, including vote choices and daily activity, SHALL be readable only by its owner.

#### Scenario: Listing users
- **WHEN** a signed-in user queries the `users` collection without the opt-in filter
- **THEN** the request is denied

#### Scenario: Opt out
- **WHEN** a user turns off "Show me on the public leaderboard"
- **THEN** their leaderboard entry is deleted

### Requirement: Complete account deletion
Deleting an account SHALL require the password, SHALL remove the user's active votes from the public tallies, SHALL delete their vote records, leaderboard entry and progress document, and SHALL delete the auth account. On-device data SHALL remain unless the user clears it.

#### Scenario: Correct password
- **WHEN** the user confirms deletion with their correct password
- **THEN** all server-side data and the auth account are deleted and the user is signed out

#### Scenario: Wrong password
- **WHEN** the password is wrong
- **THEN** nothing is deleted and an error is shown

### Requirement: Legal links
The sign-up screen and Settings SHALL link to the Privacy Policy and Terms. Settings SHALL also link to Support and the account-deletion page.

#### Scenario: Sign-up consent text
- **WHEN** the user views the sign-up form
- **THEN** it states that signing up accepts the Terms and Privacy Policy, with both linked

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
