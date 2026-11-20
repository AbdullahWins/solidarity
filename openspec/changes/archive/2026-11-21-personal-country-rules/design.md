# Design

## Context

Local data lives in AsyncStorage under `solidarity:v1:*` keys. `lib/preferences.ts` shows the pattern: an async load plus a synchronous in-memory mirror for hot paths such as haptics. Verdicts come from `useCountryVotes().getVerdict(country)`. `ScanRecord.isPositive` stores the community verdict at scan time. Country keys are normalised by `normalizeCountryKey` in `lib/votes.ts`.

## Goals / Non-Goals

**Goals:** an instant, offline rule lookup during scanning, and a single source for "what is the answer for this country".

**Non-Goals:** syncing rules across devices (export/import in `everyday-polish` covers moving devices), rules for brands or products, and rules for non-votable ranges.

## Decisions

### D1. Storage
`solidarity:v1:countryRules` holds `Record<countryKey, "avoid" | "support">`, with `getCachedRules()` as a synchronous mirror loaded at startup alongside `loadMyVotes()` in `app/_layout.tsx`. A small subscriber set lets every mounted hook re-render on change. Tab screens stay mounted, so focus-reload alone would leave stale markers.

### D2. One answer function
`resolveAnswer(country, communityVerdict) → { source: "rule" | "community" | "none", tone: "positive" | "negative" | "neutral", rule? }` lives in `lib/countryRules.ts`. The result card, haptics, History and Community all use it, so they can never disagree.

### D3. Scan records
`ScanRecord` gains an optional `rule?: "avoid" | "support"`, captured at scan time. History colouring uses `rule` when present, otherwise `isPositive`. Existing records have no `rule`, which needs no migration.

### D4. Controls
`RuleSwitch` is a three-option segmented control (Avoid · No rule · Support) on the country screen and inside the result's Details area. Changing it triggers a selection haptic.

## Risks / Trade-offs

- [Users confuse their rule with the community verdict] → The primary line always says "You avoid / You support", and the community line is labelled "Community: …".
- [A rule on a country later renamed in `country-map`] → Keys are normalised names. A renamed country loses its rule, and the My rules screen drops keys that no longer match a votable country.
