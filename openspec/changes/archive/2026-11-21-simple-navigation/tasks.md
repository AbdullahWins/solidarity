# Tasks

## 1. Navigation

- [x] 1.1 Move `profile.tsx` and `settings.tsx` from `app/(tabs)/` to `app/` as stack screens with a back header, and register them in `app/_layout.tsx`. Verify that `/profile` and `/settings` open on web with a back button.
- [x] 1.2 Reduce `app/(tabs)/_layout.tsx` to Scan, History and Community, and update the `AdaptiveTabBar` sizing for three items. Verify on web at phone portrait (bottom bar) and tablet landscape (rail) sizes.
- [x] 1.3 Add an `AccountButton` component and pass it through the existing `Screen` `headerRight` slot (and `ScreenHeader.right` on Community) on the three tabs. Verify that tapping it opens Profile, that Settings is reachable from Profile, and that the button has a 44 dp target and an accessibility label.

## 2. History

- [x] 2.1 Rename `stats.tsx` to `history.tsx`, with the summary card on top and the day-grouped list below. Verify that the demo-mode screenshot shows the summary above the newest scans.
- [x] 2.2 Move the activity graph, top countries and share under a collapsed "More stats" section, with its open state saved in preferences. Verify that the open state survives an app reload.

## 3. Community

- [x] 3.1 Extract `components/leaderboard/LeaderboardList.tsx` from `leaderboard.tsx`, add the Countries/Leaderboard `SegmentedControl` to Community, and delete the leaderboard tab route. Verify that the leaderboard loads only when its segment is selected, with no fetch when Community is focused on Countries.

## 4. Scan

- [x] 4.1 Rebuild the result card verdict-first, with "Scan next" and a collapsed "Details & vote" disclosure (design D5). Verify in demo mode that positive, negative and non-votable results render, and that voting works from the disclosure.
- [x] 4.2 Collapse manual entry behind "Type a code instead", and remove the "How it works" card and the recent strip. Verify that the Scan tab at rest shows only the camera or permission prompt and the link.

## 5. Wrap-up

- [x] 5.1 Update the `scripts/screenshots.mjs` routes, any onboarding copy that names tabs, and the README "What it does" section. Verify by running `npm run screenshots` and checking the gallery for every screen.
- [x] 5.2 Run `npm run verify`. Verify that it passes.
