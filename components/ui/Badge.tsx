import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";

import { colors, radius, spacing, typography } from "../../constants/theme";
import type { BadgeDefinition } from "../../lib/badges";

type Props = {
  badge: BadgeDefinition;
  unlocked: boolean;
  style?: StyleProp<ViewStyle>;
};

export function Badge({ badge, unlocked, style }: Props) {
  return (
    <View
      style={[styles.container, !unlocked && styles.locked, style]}
      accessible
      accessibilityLabel={`${badge.name}. ${badge.description} ${unlocked ? "Unlocked." : "Locked."}`}
    >
      {unlocked ? (
        <LinearGradient
          pointerEvents="none"
          colors={["rgba(251, 191, 36, 0.14)", "rgba(251, 191, 36, 0)"]}
          style={StyleSheet.absoluteFill}
        />
      ) : null}
      <View style={[styles.iconWrap, unlocked && styles.iconWrapUnlocked]}>
        <Ionicons name={unlocked ? badge.icon : "lock-closed"} size={22} color={unlocked ? colors.gold : colors.muted} />
      </View>
      <Text style={[styles.name, !unlocked && styles.nameLocked]} numberOfLines={2}>
        {badge.name}
      </Text>
      <Text style={styles.description} numberOfLines={2}>
        {badge.description}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    gap: 4,
    overflow: "hidden",
  },
  locked: {
    opacity: 0.55,
  },
  iconWrap: {
    width: 46,
    height: 46,
    borderRadius: radius.pill,
    backgroundColor: colors.panel,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xs,
  },
  iconWrapUnlocked: {
    backgroundColor: "rgba(251, 191, 36, 0.16)",
    borderWidth: 1,
    borderColor: "rgba(251, 191, 36, 0.35)",
  },
  name: {
    ...typography.caption,
    color: colors.text,
    textAlign: "center",
  },
  nameLocked: {
    color: colors.subtext,
  },
  description: {
    fontSize: 11,
    color: colors.muted,
    textAlign: "center",
    lineHeight: 14,
  },
});
