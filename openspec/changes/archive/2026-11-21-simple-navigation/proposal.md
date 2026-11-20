# Proposal

## Why

The app has six tabs (Scan, Stats, Ranks, Vote, Profile, Settings) for what is mostly one job: scan a product and see whether to buy it. Six tabs crowd the bottom bar on phones and split related things apart (stats vs history, voting vs ranks). The scan result also packs a verdict badge, vote bar, metadata, disclaimer and two buttons into one card. The app should feel simple and fast: one obvious action, one obvious answer.

## What Changes

- Navigation goes from six tabs to **three: Scan, History, Community**.
  - **History** combines the old Stats tab: a compact summary, then the scan history.
  - **Community** combines voting and the leaderboard behind a two-way switch (Countries / Leaderboard).
  - **Profile** and **Settings** move off the tab bar. A header avatar button on every tab opens Profile, and Settings is reached from Profile.
- **Scan result redesigned verdict-first**: a large verdict line ("Looks fine" / "Community says avoid") with the flag and country, and one primary action "Scan next". Voting, barcode details and the registration note move into a secondary "Details & vote" area on the same card.
- **Scan screen decluttered**: manual entry is collapsed behind a "Type a code instead" link. The first-run "How it works" card and the recent-scans strip are removed, because onboarding and History cover them.
- **Visual simplification across tabs**: fewer cards per screen, one accent colour per screen, larger type for the primary number or answer, and secondary information collapsed by default.
- The review screenshot script and the onboarding copy are updated for the new navigation.

## Capabilities

### New Capabilities
<!-- none -->

### Modified Capabilities
- `adaptive-ui`: navigation becomes three primary destinations, with Profile and Settings reached from a header button. It still adapts between a bottom bar and a side rail.
- `barcode-scanning`: the result leads with the verdict and a single primary action, and the other result details become secondary.

## Impact

- Routes: `app/(tabs)/_layout.tsx` (three tabs), `app/(tabs)/stats.tsx` becomes `app/(tabs)/history.tsx`, `app/(tabs)/leaderboard.tsx` is folded into `app/(tabs)/community.tsx`, and `app/(tabs)/profile.tsx` and `settings.tsx` become the stack screens `app/profile.tsx` and `app/settings.tsx`.
- Components: `components/scanner/ScanScreen.tsx` (result card, collapsed manual entry), `components/ui/Screen.tsx` (header avatar action), `components/navigation/AdaptiveTabBar.tsx` (three items).
- Tooling: `scripts/screenshots.mjs` routes, and the `app/onboarding.tsx` copy if it names tabs.
- No data, storage or backend change. Existing links to `/profile` and `/settings` keep working as stack routes.
- This should land before `personal-country-rules`, `basket-mode` and `everyday-polish`, which build on the new result card and History screen.
