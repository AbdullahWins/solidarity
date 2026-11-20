# Spec Delta

## Purpose
Defines when the optional daily streak reminder fires, so that it only nudges users who have not scanned yet that day.

## ADDED Requirements

### Requirement: Remind only when needed
When enabled, a reminder SHALL fire at 19:00 local time only on days with no scan. A scan before 19:00 SHALL cancel that day's reminder.

#### Scenario: Scanned today
- **WHEN** the user scans at 10:00 with reminders enabled
- **THEN** no reminder fires at 19:00 that day, and reminders stay scheduled for the following days

#### Scenario: Disabled
- **WHEN** the user turns reminders off
- **THEN** all pending reminders are cancelled
