# Tasks

## 1. Country identity

- [x] 1.1 Add `constants/country-iso.ts` and `scripts/generate-flags.mjs`, and generate `constants/flags.ts`; verify every votable country has a flag (unit test)
- [x] 1.2 Add the `Flag` component (SVG flag or neutral glyph); verify by typecheck and screenshots

## 2. New screens

- [x] 2.1 Onboarding screen, storage flag and tab-layout gate (skipped for users with scans); verify in the onboarding screenshot and by tapping through it
- [x] 2.2 Country detail route with verdict, voting, prefixes and the user's scans; verify in the country screenshots

## 3. Screen revamp

- [x] 3.1 Scan: flag result card with "View country", recent-scans strip, web demo viewfinder; verify in the Scan screenshots
- [x] 3.2 Stats: donut, day-grouped history with flags, tappable rows; verify in the Stats screenshots
- [x] 3.3 Community: persistent search, sort chips, flag cards linking to details; verify in the Community screenshots
- [x] 3.4 Profile XP ring, and Settings account row plus Replay intro; verify in the screenshots
- [x] 3.5 Share card with flags for top countries; verify by typecheck

## 4. Review tooling and quality

- [x] 4.1 `lib/demo.ts` (web-only) plus the leaderboard and auth fixtures; verify native paths never enable it (unit test)
- [x] 4.2 `scripts/screenshots.mjs` and `npm run screenshots` writing `Screenshots/` with the gallery; verify the gallery opens from disk with every image present
- [x] 4.3 `npm run verify` and `expo-doctor` pass; `openspec validate premium-revamp` passes
