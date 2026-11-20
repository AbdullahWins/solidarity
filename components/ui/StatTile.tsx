import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { colors, radius, spacing, typography } from "../../constants/theme";

type Tone = "default" | "positive" | "negative" | "gold" | "accent";

type Props = {
  label: string;
  value: string | number;
  tone?: Tone;
  icon?: React.ComponentProps<typeof Ionicons>["name"];
};

const TONE: Record<Tone, string> = {
  default: colors.text,
  positive: colors.positive,
  negative: colors.negative,
  gold: colors.gold,
  accent: colors.accent,
};

export function StatTile({ label, value, tone = "default", icon }: Props) {
  const tint = TONE[tone];
  return (
    <View style={styles.container} accessible accessibilityLabel={`${label}: ${value}`}>
      <View style={styles.top}>
        {icon ? (
          <View style={[styles.iconWrap, { backgroundColor: `${tint}1F` }]}>
            <Ionicons name={icon} size={14} color={tint} />
          </View>
        ) : null}
        <Text style={styles.label} numberOfLines={2}>
          {label}
        </Text>
      </View>
      <Text style={[styles.value, { color: tone === "default" ? colors.text : tint }]} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    minWidth: 96,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.sm,
  },
  top: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs + 2,
  },
  iconWrap: {
    width: 22,
    height: 22,
    borderRadius: 7,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    ...typography.caption,
    color: colors.subtext,
    flexShrink: 1,
  },
  value: {
    ...typography.stat,
  },
});
