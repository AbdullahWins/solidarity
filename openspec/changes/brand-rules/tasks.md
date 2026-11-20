# Tasks

## 1. Store and answer

- [ ] 1.1 Create `lib/brandRules.ts` (normalise, set, clear, merge, subscribe) and `hooks/useBrandRules.ts`. Verify with jest tests for normalisation (case, accents), set/clear and merge-without-overwrite.
- [ ] 1.2 Extend `resolveAnswer` with product and brand rules (design D2). Verify with jest tests: brand beats country, owner beats country, Avoid wins a conflict, no product means country/community as before.

## 2. Scan, basket, history

- [ ] 2.1 Add `BrandRuleSwitch` to the result details for the brand and the owner; drive the verdict, a one-time late haptic/announcement and the `brandRule` record patch (design D3). Verify in a demo screenshot with a seeded brand rule.
- [ ] 2.2 Basket: recompute the item tone when product details arrive. History: `toneOf` uses `brandRule` first. Verify with basket and historyFilter jest tests.

## 3. Rules screen, backup, docs

- [ ] 3.1 Add the Brands section to My rules (with the product-names note), and include brand rules in export/import. Verify with a backup jest test and a demo screenshot.
- [ ] 3.2 Update the privacy policy's on-device row and the support FAQ. Run `npm run verify`. Verify that both are done and verify passes.
