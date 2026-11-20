# Design

## Context

Country rules live in `lib/countryRules.ts` (store, subscribe, `resolveAnswer`). Product details (brand, owner) arrive asynchronously after a scan through `useProductLookup` (single mode) or a direct `lookupProduct` call (basket mode).

## Decisions

### D1. Storage and keys
`solidarity:v1:brandRules` holds `Record<key, { rule, label }>`, where `key = normalizeName(label)` (lowercase, accents stripped, non-alphanumerics collapsed to "-") and `label` is the display text. Brand and owner names share one namespace, so a rule on "Nestlé" matches whether it appears as brand or owner.

### D2. One answer function
`resolveAnswer(country, communityPositive, rules, product?, brandRules?)`. Order: brand/owner rules (Avoid wins on conflict), then country rule, then community. The answer gains `source: "brand-rule"` and `target` (the label). Everything that already uses `resolveAnswer` (result, haptics, History, basket) keeps working.

### D3. Late updates
The result re-renders when product details arrive. A ref remembers the tone already signalled for the current scan; if the new answer's tone differs, the haptic and announcement fire once more. The scan record is patched with `brandRule: { rule, target }`. In basket mode the lookup callback recomputes the tone and calls `updateBasketItem`.

### D4. Rules screen
`app/rules.tsx` gains a Brands section. When product names are off, it shows a note with a button to turn them on.

## Risks / Trade-offs

- [Brand spelled differently across products] → Normalised keys cover case and accents. Owner rules catch most variants because owners are more consistent in Open Food Facts.
- [Users expect brand rules without product names] → The rules screen and the result explain the dependency.
