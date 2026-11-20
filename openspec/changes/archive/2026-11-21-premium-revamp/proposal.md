# Proposal

## Why

The 1.1.0 redesign fixed layout and compliance, but the app still reads as a set of screens rather than a polished product. There is no first-run guidance, country information appears only as text, a country can't be explored beyond its vote buttons, and history and stats are flat lists. The owner also needs to review every screen without building the app.

## What Changes

- **Country identity**: an SVG flag for every votable country, used in scan results, Community, Stats, the country detail screen and the share card. Non-country ranges get a neutral glyph.
- **Onboarding**: a three-step first-run intro (scan, community verdict, privacy) ending in the camera permission request. Shown once, skipped for existing users who already have scans, and replayable from Settings.
- **Country detail screen**: flag hero, community verdict and approval ratio, voting, the GS1 prefixes registered to the country, and the user's own scans of it. Reachable from Scan, Community and Stats.
- **Scan**: result card with flag and a "View country" action, a recent-scans strip for one-tap recall, a polished manual-entry row and a demo viewfinder on web.
- **Stats**: positive/negative donut, history grouped by day with flags, tappable rows.
- **Community**: always-visible search, sort chips (most votes, A–Z, most positive, most negative), flag cards that open the detail screen.
- **Profile**: avatar wrapped in an XP progress ring.
- **Settings**: account summary row and "Replay intro".
- **Review screenshots**: a reproducible script that renders every screen of the web build at phone and tablet sizes in both orientations with demo data, writing PNGs and an HTML gallery to `Screenshots/`.

## Capabilities

### New Capabilities
- `onboarding`: first-run introduction and when it is shown.
- `country-details`: per-country screen and how users reach it.
- `review-screenshots`: generated screenshot set for design review.

### Modified Capabilities
- `adaptive-ui`: adds country flags and tappable navigation to country details across screens.

## Impact

- New: `app/onboarding.tsx`, `app/country/[name].tsx`, `components/ui/Flag.tsx`, `components/ui/Donut.tsx`, `components/ui/ProgressRing.tsx`, `constants/flags.ts` (generated), `constants/country-iso.ts`, `lib/onboarding.ts`, `lib/demo.ts`, `scripts/generate-flags.mjs`, `scripts/screenshots.mjs`, `Screenshots/`.
- Modified: every tab screen, the scanner, share card and settings.
- Dev dependencies: `country-flag-icons` (flag source, build time only), `playwright-core` (screenshots, uses the installed Chrome).
- No backend or data-model change. Demo mode is web-only and opt-in via a localStorage flag, so it never affects native builds.
