# Solidarity

Know what you buy. Scan a product's barcode, see which country it's registered to, and check
the community's verdict — powered by open voting, not developer-asserted claims.

## What it does

- **Scan** — point the camera at a barcode (or type it in manually) to identify the product's
  GS1 country of registration.
- **Community voting** — every country's "positive"/"negative" color is decided by open
  upvote/downvote from Solidarity users, visible to everyone, votable by verified accounts.
  See `app/(tabs)/community.tsx` and `lib/votes.ts`.
- **Gamification** — XP, levels, daily streaks, and badges for both scanning and voting
  activity. See `lib/gamification.ts` and `lib/badges.ts`.
- **Stats** — a GitHub-style daily contribution graph, scan history, and a shareable stats
  image for social media.
- **Leaderboard** — optional, opt-in, ranked by XP.
- **Optional accounts** — email/password auth with required email verification before voting
  or appearing on the leaderboard. The app works fully offline without an account; only
  aggregated progress (XP, level, streaks, badges, vote choices) ever syncs to the cloud —
  raw scan history and barcodes never leave the device.

## Tech stack

- Expo SDK 54 (React Native 0.81, New Architecture), `expo-router` for file-based navigation.
- Firebase JS SDK (Auth + Firestore) for optional accounts, cloud sync, voting, and the
  leaderboard — no native Firebase module, no `google-services.json` required.
- Local-first persistence via `AsyncStorage` (`lib/storage.ts`) — scans, gamification state,
  and preferences all live on-device and work with no network connection.
- `react-native-reanimated`, `react-native-svg`, `react-native-view-shot` for the UI polish
  and the shareable stats card.

## Getting started

```bash
npm install
cp .env.example .env   # fill in your Firebase web app config (optional — app works without it)
npx expo start
```

This app uses native modules (camera, notifications, media library, Firebase), so it needs a
**development build**, not Expo Go:

```bash
npx expo run:android   # or: npx expo run:ios
```

## Firebase setup (optional — only needed for accounts/voting/leaderboard)

1. Create a Firebase project (free Spark plan, no card needed) and register a **Web** app —
   copy its config into `.env` (see `.env.example`).
2. Enable **Email/Password** sign-in under Authentication.
3. Create a **Firestore Database** in Native mode.
4. Deploy the security rules and required composite index:
   ```bash
   npx firebase deploy --only firestore --project <your-project-id>
   ```
   (rules live in `firestore.rules`, indexes in `firestore.indexes.json`, wired together by
   `firebase.json`.)

## Production builds

Release signing reads a gitignored `keystore.properties` + `.jks` file at the project root
(see `keystore.properties.example`) — this survives `expo prebuild --clean` via
`plugins/withReleaseSigning.js`, and falls back to debug signing if absent so local builds
keep working without the real keystore.

```bash
npx expo prebuild --platform android --clean
cd android
./gradlew bundleRelease
```

Output: `android/app/build/outputs/bundle/release/app-release.aab`.

See `PLAY_STORE_LISTING.md` for the store listing copy.
