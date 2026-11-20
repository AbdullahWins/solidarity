# Proposal

## Why

Country rules can't express the most common reason people check products: they want to avoid (or support) a specific company. A company's products carry barcodes registered in many countries, so a country rule misses them. With product names and brand owners available, users can set rules on the brand or the company itself.

## What Changes

- Users can mark a **brand** or a **brand owner** (company) as Avoid or Support from the result's details when the product is known, and manage them in **Settings → My rules** alongside country rules.
- When a scanned product's brand or owner has a rule, that rule **leads the result** ("You avoid Nestlé"), ahead of any country rule and the community verdict, which are shown beneath. If the brand and owner rules disagree, Avoid wins.
- Because product details arrive after the scan, the result, haptic and screen-reader announcement update once when a brand rule applies. Basket items update their verdict too.
- History colours and filters respect brand rules applied at scan time. Brand rules are included in backups and never leave the device otherwise.
- Brand rules need product names to be on. Without them, the rules screen explains that.

## Capabilities

### New Capabilities
- `brand-rules`: on-device Avoid/Support rules for brands and companies, and how they lead the scan answer.

### Modified Capabilities
<!-- personal-rules (country) behaviour is unchanged; brand rules take precedence in the new capability. -->

## Impact

- New: `lib/brandRules.ts`, `hooks/useBrandRules.ts`, `components/rules/BrandRuleSwitch.tsx`.
- Modified: `lib/countryRules.ts` (`resolveAnswer` takes product and brand rules), `components/scanner/ScanScreen.tsx` and `ProductRow.tsx`, `app/rules.tsx` (brands section), `lib/types.ts` (`brandRule` on scans), `lib/historyFilter.ts`, `lib/basket.ts`, `lib/backup.ts`/`backupIO.ts`, privacy policy (on-device data row), support FAQ.
- Depends on `brand-owner`.
