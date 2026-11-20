# Proposal

## Why

The community verdict is a crowd opinion, but people shop by their own principles. Someone who has decided to avoid, or to support, a particular country has to remember it at every scan and mentally override the community colour. Letting users record their own rule makes the scan answer theirs, with no account and no server.

## What Changes

- Users can mark any votable country as **Avoid** or **Support**, or clear the mark. This is set from the country screen and from the scan result's details.
- The scan result leads with the user's own rule when one exists ("You avoid Germany"). The community verdict is shown beneath it as secondary information. With no rule, the result is unchanged.
- The haptic and the History colour follow the personal rule when one exists.
- Settings gets a **My rules** screen that lists every rule, lets the user remove them, and has a "Clear all" action.
- Community country cards show a small marker for countries the user has a rule on, and a filter chip "My rules" lists only those countries.
- Rules are stored only on the device. They are not synced, uploaded or added to the cloud backup.

## Capabilities

### New Capabilities
- `personal-rules`: on-device avoid/support rules per country, and how they affect the scan answer, History and Community.

### Modified Capabilities
<!-- The result-feedback wording is covered by the new capability's requirements; no existing requirement text changes. -->

## Impact

- New: `lib/countryRules.ts` (storage and in-memory mirror), `hooks/useCountryRules.ts`, `app/rules.tsx` (My rules screen), `components/rules/RuleSwitch.tsx`.
- Modified: `components/scanner/ScanScreen.tsx` (verdict source, haptic), `app/country/[name].tsx` (rule control), `app/(tabs)/community.tsx` (marker and filter chip), History rows, `lib/types.ts` (optional `rule` on `ScanRecord`), Settings (entry row).
- Privacy policy: the on-device data table gains "Your country rules — on your device only". No new data leaves the device.
- Depends on `simple-navigation` (verdict-first result card and Details area).
