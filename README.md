# Solidarity

Know what you buy. Scan a product's barcode, see which country it's registered to, and check the
community's verdict, decided by open voting rather than developer-asserted claims.

Website: <https://abdullahwins.github.io/solidarity/> (source in [`website/`](website/)).

## What it does

- **Scan**: camera (EAN-13, EAN-8, UPC-A, UPC-E) or typed entry. Codes are normalised to GTIN-13
  and check digits are validated ([`lib/gtin.ts`](lib/gtin.ts)), then mapped to a GS1 country
  ([`lib/scan-logic.ts`](lib/scan-logic.ts)).
- **Community voting**: every country's positive/negative colour comes from public up/down
  tallies. Verified accounts can vote ([`lib/votes.ts`](lib/votes.ts)).
- **Gamification**: XP, levels, streaks and badges for scanning and voting.
- **Stats**: activity graph, history, top countries, shareable stats image.
- **Leaderboard**: opt-in, verified accounts only.
- **Optional accounts**: everything works offline without one. Raw scan history never leaves the
  device.

## Tech stack

- Expo SDK 58 (React Native 0.88, React 19.3, New Architecture), Expo Router (JS tabs with a
  custom adaptive tab bar: floating bottom bar on compact portrait, side rail on tablets and
  landscape).
- Firebase JS SDK 13 (Auth with AsyncStorage persistence, Firestore).
- `expo-image` for every bitmap, `expo-linear-gradient`, Reanimated 4.
- Local-first persistence in AsyncStorage ([`lib/storage.ts`](lib/storage.ts)).

## Getting started

```bash
npm install
cp .env.example .env      # Firebase web config (optional: the app works without it)
npm run android           # or: npm run ios  (development build; Expo Go isn't supported)
```

Quality checks:

```bash
npm run verify            # typecheck + lint + unit tests
npm run doctor            # expo-doctor
```

## Firebase setup (accounts, voting, leaderboard)

1. Create a Firebase project and register a **Web** app. Copy its config into `.env`.
2. Enable **Email/Password** sign-in under Authentication.
3. Create a **Firestore** database.
4. Deploy rules and indexes:
   ```bash
   npx firebase deploy --only firestore --project <project-id>
   ```

### Data model

| Collection | Visibility | Contents |
|---|---|---|
| `users/{uid}` | owner only | progress summary, vote choices (private backup) |
| `leaderboard/{uid}` | public | display name, XP, level, streaks (opted-in, verified users only) |
| `countryTallies/{country}` | public | anonymous up/down counts |
| `countryVotes/{country}/voters/{uid}` | owner only | that user's vote |

`firestore.rules` keeps a temporary legacy rule so app versions ≤ 1.0.2 can still list opted-in
users from `users`. Remove it, and the composite index in `firestore.indexes.json`, once those
versions are no longer in use.

## Production builds

Release signing reads a gitignored `keystore.properties` + `.jks` at the project root (see
`keystore.properties.example`), wired by `plugins/withReleaseSigning.js`.

```bash
npx expo prebuild --platform android --clean
cd android && ./gradlew bundleRelease
```

Store-compliance config lives in config plugins so it survives `prebuild --clean`:

- `plugins/withAndroidStoreCompliance.js`: optional camera and screen features (no
  orientation lock) and the optimising R8 config (`proguard-android-optimize.txt`).
- `plugins/withCleanPermissions.js` and `android.blockedPermissions`: no audio, media-read or
  overlay permissions.
- iOS: privacy manifest, export-compliance flag, purpose strings and iPad multitasking are in
  `app.json`.

App icons are generated from `assets/source/icon-original.png` with `npm run icons`.

### Release checklist

1. Deploy `firestore.rules` before or together with the release.
2. Bump `version`, `android.versionCode` and `ios.buildNumber` in `app.json`.
3. `npm run verify && npm run doctor`.
4. Fill in the website placeholders once:
   `python scripts/fill-website.py --developer "…" --email … --law "…"`.
5. Set `IOS_APP_STORE_ID` in `constants/app-info.ts` once the App Store listing exists.

## Website

Static pages in `website/` (home, privacy, terms, support, account deletion, 404), deployed by
`.github/workflows/pages.yml`. In repo **Settings → Pages**, set the source to **GitHub Actions**.
The workflow refuses to deploy while placeholders are unfilled. Store-console URLs:

| Field | URL |
|---|---|
| Privacy policy (both stores) | `…/privacy-policy.html` |
| Support URL (App Store) | `…/support.html` |
| Account deletion URL (Play Data safety) | `…/delete-account.html` |
| Marketing / website | `…/` |

See `PLAY_STORE_LISTING.md` for the store listing copy.

## Planning

Changes are tracked with [OpenSpec](https://github.com/Fission-AI/OpenSpec) in `openspec/`.
