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
