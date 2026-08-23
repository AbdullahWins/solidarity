import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { colors, radius, spacing, typography } from "../../constants/theme";

type Props = {
  label: string;
  value: string | number;
  tone?: "default" | "positive" | "negative";
};

export function StatTile({ label, value, tone = "default" }: Props) {
  return (
    <View
      style={[
        styles.container,
        tone === "positive" && styles.positive,
        tone === "negative" && styles.negative,
      ]}
    >
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  positive: {
    borderColor: `${colors.positive}88`,
  },
  negative: {
    borderColor: `${colors.negative}88`,
  },
  label: {
    ...typography.caption,
    color: colors.subtext,
  },
  value: {
    ...typography.title,
    color: colors.text,
    marginTop: spacing.xs,
  },
});
