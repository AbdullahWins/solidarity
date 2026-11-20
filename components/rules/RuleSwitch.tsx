import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { colors, spacing, typography } from "../../constants/theme";
import { useCountryRules } from "../../hooks/useCountryRules";
import { setRule, type CountryRule } from "../../lib/countryRules";
import { normalizeCountryKey } from "../../lib/votes";
import { SegmentedControl } from "../ui/SegmentedControl";

/** Avoid · No rule · Support for one country. Saved on the device only. */
export function RuleSwitch({ country, showCaption = true }: { country: string; showCaption?: boolean }) {
  const rules = useCountryRules();
  const current = rules[normalizeCountryKey(country)] ?? "none";
  return (
    <View style={styles.root}>
      {showCaption ? (
        <Text style={styles.caption}>Your rule for {country}. Only on this device.</Text>
      ) : null}
      <SegmentedControl
        segments={[
          { key: "avoid", label: "Avoid" },
          { key: "none", label: "No rule" },
          { key: "support", label: "Support" },
        ]}
        value={current}
        onChange={(key) => void setRule(country, key === "none" ? null : (key as CountryRule))}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: spacing.sm,
  },
  caption: {
    ...typography.caption,
    color: colors.subtext,
  },
});
