# app-website Specification

## Purpose
Provides the public pages both stores require (privacy policy, terms, support, account deletion) plus a home page, hosted on GitHub Pages.

## Requirements

### Requirement: Required pages
The site SHALL contain `index.html`, `privacy-policy.html`, `terms.html`, `support.html`, `delete-account.html` and `404.html`, using relative links, no JavaScript, no external fonts and no trackers.

#### Scenario: Offline open
- **WHEN** any page is opened from disk
- **THEN** styles load and every internal link resolves

### Requirement: Accurate privacy policy
The privacy policy SHALL describe only data the app actually collects, stores, shares and deletes, as verified against the code and Firestore rules.

#### Scenario: Vote data
- **WHEN** a reader checks what happens to votes
- **THEN** the policy states that votes are stored against the account, counted in public anonymous tallies, and retracted on account deletion

### Requirement: Account deletion page
The deletion page SHALL name the app and developer, list the in-app steps, offer an email route that works without the app, and state what is deleted and what is kept.

#### Scenario: No app installed
- **WHEN** a user without the app wants their account deleted
- **THEN** the page tells them to email from the account address with a set subject, and states the response time

### Requirement: Deployment
A GitHub Actions workflow SHALL deploy `website/` to GitHub Pages on pushes to `main` that touch it.

#### Scenario: Push
- **WHEN** a commit changing `website/` lands on `main`
- **THEN** the Pages workflow deploys it
