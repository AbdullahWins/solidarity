# Design

## Context

See proposal.md (Why). Routes live in `app/(tabs)/` with a custom `AdaptiveTabBar`, which renders a bottom bar or a side rail via `useLayout().useRail`. Tab screens stay mounted after their first visit, and hooks reload on focus (`useScanHistory`, `useCountryVotes`). `Screen` provides the title, overline and pull-to-refresh. `scripts/screenshots.mjs` visits routes by URL.

## Goals / Non-Goals

**Goals:** fewer destinations, a verdict-first result, less on screen by default, and no loss of any existing function.

**Non-Goals:** a light theme, a new design-token set (we reuse `constants/theme.ts` and remove usage rather than add styles), and any change to what the leaderboard or voting does.

## Decisions

### D1. Three tabs, with Profile and Settings as stack screens
`app/(tabs)/` keeps `index` (Scan), `history` and `community`. `profile.tsx` and `settings.tsx` move to `app/` as stack screens with the standard header and a back button. The `/profile` and `/settings` URLs keep working, so the existing `router.navigate("/profile")` calls and the web screenshots resolve unchanged.
*Alternative:* hide the tabs with `href: null`. Rejected because the screens would remain tab scenes, with tab-bar padding and no back button.

### D2. Header avatar
`Screen` gains an optional `headerAction` slot. The three tab screens pass an `AccountButton`: the `Avatar` at 32 dp inside a 44 dp touch target. It shows initials when signed in and a person icon otherwise, pushes `/profile`, and has the accessibility label "Profile and settings".

### D3. History is the old Stats, simplified
Renamed route, same data hooks. The layout is one summary card (total scans, positive/negative donut and streak) followed by the day-grouped history list. The activity graph, top countries and share button move under a "More stats" section. It is collapsed by default, and its open state is remembered per device (`preferences.historyMoreStatsOpen`).

### D4. Community switch
A `SegmentedControl` at the top switches between Countries and Leaderboard. The leaderboard content is extracted from `leaderboard.tsx` into `components/leaderboard/LeaderboardList.tsx` and mounts only while its segment is selected. That keeps leaderboard reads off ordinary Community visits, which matters for the `firestore-read-budget` change. The selected segment is kept in component state and survives tab switches, because tab screens stay mounted.

### D5. Verdict-first result card
- **Top:** the flag and country at title size.
- **Verdict line:** larger type, coloured, with an icon. It reads "Looks fine" or "Community says avoid", or a neutral text for non-votable and unknown ranges.
- **Primary action:** a full-width "Scan next" button.
- **Details:** a `Details & vote` disclosure row that expands in place to the vote buttons, the code and type line, the disclaimer and the "View country" link. It starts collapsed on every new result.

The haptics logic is unchanged.

### D6. Scan tab at rest
Manual entry sits behind a text link, "Type a code instead", which expands the existing `TextField` and Look up button. The "How it works" card and the recent strip are removed, and recent scans live in History.

## Risks / Trade-offs

- [Users used to six tabs can't find Settings] → The avatar is on every tab, and the release notes mention the move.
- [Voting is one tap deeper on the scan result] → Acceptable. Voting is occasional and the verdict is the frequent need. The full vote UI stays on Community and the country screen.
- [Screenshot script and README references go stale] → Covered by tasks.
