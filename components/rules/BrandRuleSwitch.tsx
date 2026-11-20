import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { colors, spacing, typography } from "../../constants/theme";
import { useBrandRules } from "../../hooks/useBrandRules";
import { setBrandRule, type BrandRule } from "../../lib/brandRules";
import { normalizeName } from "../../lib/productLookup";
import { SegmentedControl } from "../ui/SegmentedControl";

/** Avoid · No rule · Support for a brand or company name. On the device only. */
export function BrandRuleSwitch({ name, kind }: { name: string; kind: "brand" | "company" }) {
  const rules = useBrandRules();
  const current = rules[normalizeName(name)]?.rule ?? "none";
  return (
    <View style={styles.root}>
      <Text style={styles.caption}>
        Your rule for the {kind} <Text style={styles.name}>{name}</Text>
      </Text>
      <SegmentedControl
        segments={[
          { key: "avoid", label: "Avoid" },
          { key: "none", label: "No rule" },
          { key: "support", label: "Support" },
        ]}
        value={current}
        onChange={(key) => void setBrandRule(name, key === "none" ? null : (key as BrandRule))}
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
  name: {
    color: colors.text,
    fontWeight: "700",
  },
});
