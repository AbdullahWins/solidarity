# Design

## Context

Local data lives in AsyncStorage (`lib/storage.ts`, `lib/preferences.ts`, and `lib/countryRules.ts` once `personal-country-rules` lands). `computeGamificationState(scans, previous)` derives scan XP, streaks and badges, and carries `voteXp` and `voteCount` forward. Native configuration goes through config plugins, because native folders are generated. History groups scans by day in `history.tsx` (the old `stats.tsx`).

## Goals / Non-Goals

**Goals:** five independent, small improvements that each ship on their own task group.

**Non-Goals:** cloud backup without an account, CSV export, and widgets.

## Decisions

### D1. Backup format
`{ app: "solidarity", version: 1, exportedAt, scans, gamification: { voteXp, voteCount, badgeUnlockedAt }, rules, preferences }`. Scan XP and streaks are not trusted from the file: they are recomputed after the merge, so editing the file can't inflate progress beyond what the scans justify. `voteXp` takes the higher of the local and file values (votes live in Firestore and can't be recomputed locally). The file is written with `expo-file-system` to the cache directory and shared with `expo-sharing`. Import uses `expo-document-picker`, with a size check before parsing.
*Alternative:* replace instead of merge. Rejected because it could silently wipe newer local scans.

### D2. History filtering
`filterScans(scans, { query, tone, period, now })` is a pure function in `lib/historyFilter.ts`, used in a `useMemo`. The tone comes from `rule ?? isPositive` (neutral for non-votable). Search is debounced by 150 ms. The filter state lives in the screen only and is not persisted.

### D3. Quick actions
`expo-quick-actions`, with static items defined in `app.json` through its config plugin. `lib/quickActions.ts` maps an action to a route: `/?mode=basket` for Basket, `/` for Scan. On a cold start, the action is read after the onboarding check, so a first-run user still sees the intro.
*Alternative:* hand-written native shortcuts XML and a plist in a custom plugin. Rejected as more code for the same result.

### D4. Announcements and haptics
`AccessibilityInfo.announceForAccessibility` is called after the result renders, using the same `resolveAnswer` text as the verdict line. Haptic patterns: positive is `notificationAsync(Success)`. Negative is two `impactAsync(Heavy)` calls 120 ms apart. That is distinct even on devices that map every notification type to the same vibration.

### D5. Explainer sheet
`BarcodeInfoSheet` is a bottom sheet built on the existing modal pattern (as in `DeleteAccountSheet`), with static copy and an `openInAppBrowser` link to GS1's prefix page.

## Risks / Trade-offs

- [A backup file shared by mistake reveals scan history] → The export screen states plainly what the file contains before sharing.
- [`expo-quick-actions` falls behind SDK updates] → It is isolated in `lib/quickActions.ts` and one plugin entry, so it is easy to drop.
- [Haptic timing differs across devices] → Covered by the device check in tasks. The pattern stays two pulses, whatever the strength.
