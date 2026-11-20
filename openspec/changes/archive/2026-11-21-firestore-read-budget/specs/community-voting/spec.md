# Spec Delta

## Purpose

Counts each country's public up and down votes from verified users and shows them to everyone, while staying within the Firebase free-tier read and write quotas.

## ADDED Requirements

### Requirement: One vote per user per country
A verified user SHALL hold at most one active vote (up or down) per country. Casting a vote SHALL replace their previous vote on that country, and retracting SHALL remove it. Each country's public counts SHALL change only by that user's own vote, in the same request that records it.

#### Scenario: Changing a vote
- **WHEN** a user who voted up on a country votes down on it
- **THEN** that country's up count drops by one and its down count rises by one

#### Scenario: Forged count
- **WHEN** a client writes a country's counts with a change that doesn't match its own vote record in the same request
- **THEN** the write is rejected

#### Scenario: Unverified user
- **WHEN** a signed-in user without a verified email tries to vote
- **THEN** the vote is rejected

### Requirement: Single-read public counts
The app SHALL get every country's public counts with a single document read. Reading the counts SHALL NOT require an account.

#### Scenario: Opening the Community tab
- **WHEN** the counts are not cached on the device
- **THEN** the app performs one document read and shows counts for every country that has votes

### Requirement: Consistent aggregate counts
The aggregate counts for a country SHALL equal that country's authoritative tally whenever they are written. If the aggregate document doesn't exist, or hasn't been reconciled for 24 hours, the next client that reads it SHALL correct every drifted entry. Only one client per period SHALL do this, so the system-wide cost stays at about one full pass a day.

#### Scenario: Vote from an older app version
- **WHEN** an app version without aggregate support records a vote
- **THEN** the aggregate reflects it no later than the next daily reconcile

#### Scenario: First launch after the rules deploy
- **WHEN** the aggregate document does not exist yet
- **THEN** a client creates it from the existing per-country tallies and later readers use it

### Requirement: Backward compatibility with older app versions
App versions released before this change SHALL keep being able to read counts and cast, change and retract votes after the new rules are deployed.

#### Scenario: Old client votes
- **WHEN** a user on the previous release votes on a country
- **THEN** the vote succeeds and that country's tally reflects it

### Requirement: Count freshness
The app SHALL reuse counts cached on the device for up to 3 hours. A user's own vote SHALL show in their counts immediately. Pull-to-refresh SHALL fetch fresh counts.

#### Scenario: Reopening within the cache window
- **WHEN** the user returns to a screen showing counts within 3 hours of the last fetch
- **THEN** no Firestore read is made

#### Scenario: Own vote
- **WHEN** the user votes
- **THEN** the counts they see include that vote immediately, without waiting for the cache to expire

### Requirement: Graceful quota exhaustion
When Firestore is unavailable or the quota is exhausted, the app SHALL keep showing the last cached counts and verdict colours instead of blanking them.

#### Scenario: Read fails
- **WHEN** fetching counts fails
- **THEN** the previously cached counts stay visible
