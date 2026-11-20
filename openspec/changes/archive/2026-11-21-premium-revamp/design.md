# Design

## Context

Builds on the 1.1.0 design system (`constants/theme.ts`, `components/ui/*`, adaptive tab bar). Expo Router routes live in `app/`. Everything renders on web through react-native-web, which is what the screenshot pipeline uses.

## Goals / Non-Goals

**Goals:** a cohesive, premium feel; faster paths (recent scans, country screen); review without native builds.

**Non-Goals:** custom fonts (system SF Pro / Roboto stay); a light theme; backend changes.

## Decisions

1. **Flags as generated SVG strings.** `scripts/generate-flags.mjs` reads `country-flag-icons/string/3x2` for the ISO codes in `constants/country-iso.ts` and writes `constants/flags.ts`, then renders them with `SvgXml`. This keeps the 5.8 MB package out of the bundle (about 110 flags, mostly a few hundred bytes each). Emoji flags were rejected because Windows and some Android skins render them as letters. Multi-country ranges use the first country (for example "USA & Canada" uses US), and non-country ranges use an Ionicons glyph.
2. **Onboarding gate in the root layout.** `lib/onboarding.ts` stores `solidarity:v1:onboarded`. The tab layout redirects to `/onboarding` when the flag is unset and there are no scans. Existing users with scans are marked as onboarded silently. The onboarding screen uses a horizontal paging ScrollView, which is reliable on every platform and needs no new dependency.
3. **Country route `app/country/[name].tsx`**, pushed on the root stack with the native header hidden and its own back button, so it works the same from any tab. It reuses `useCountryVotes` and `useScanHistory`. The prefix list is derived from `constants/country-map.ts`.
4. **Charts with react-native-svg.** `Donut` (positive vs negative) and `ProgressRing` (XP around the avatar) are small SVG components with no chart library.
5. **Demo mode (`lib/demo.ts`).** `isDemo()` is true only when `Platform.OS === "web"` and `localStorage["solidarity:demo"] === "1"`. In demo mode the leaderboard returns a fixture, and AuthContext exposes a fixture user so signed-in screens can be captured. Scans, gamification and tallies are seeded through localStorage by the screenshot script itself, which also blocks all `googleapis.com` traffic so nothing reaches Firebase.
6. **Screenshot pipeline.** `scripts/screenshots.mjs` uses `playwright-core` driving the installed Chrome (no browser download): it runs `expo export --platform web`, serves `dist/` with a small Node static server mapping clean URLs, and captures each route at four viewports (phones at 2× scale, tablets at 1×). It also drives the Scan screen through a manual lookup, and writes `Screenshots/<device>/<nn-screen>.png` plus `Screenshots/index.html`.

## Risks / Trade-offs

- [Web rendering differs slightly from native (no blur on Android, system font differences)] → Screenshots are for layout and design review; final checks happen on device.
- [Generated flags file is large to diff] → It is generated and documented, and regenerated only when the country list changes.
- [Demo code ships in the bundle] → Gated on web plus an explicit flag. Native code paths never enable it.
