import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { colors, radius, spacing, typography } from "../../constants/theme";
import type { BadgeDefinition } from "../../lib/badges";

type Props = {
  badge: BadgeDefinition;
  unlocked: boolean;
};

export function Badge({ badge, unlocked }: Props) {
  return (
    <View style={[styles.container, !unlocked && styles.locked]}>
      <View style={[styles.iconWrap, unlocked && styles.iconWrapUnlocked]}>
        <Ionicons
          name={unlocked ? badge.icon : "lock-closed"}
          size={22}
          color={unlocked ? colors.gold : colors.muted}
        />
      </View>
      <Text style={[styles.name, !unlocked && styles.nameLocked]} numberOfLines={1}>
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
    width: "31%",
    alignItems: "center",
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    gap: 4,
  },
  locked: {
    opacity: 0.5,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    backgroundColor: colors.panelSoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xs,
  },
  iconWrapUnlocked: {
    backgroundColor: `${colors.gold}22`,
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
    fontSize: 10,
    color: colors.muted,
    textAlign: "center",
    lineHeight: 13,
  },
});
