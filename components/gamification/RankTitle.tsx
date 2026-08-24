import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { colors, radius, spacing, typography } from "../../constants/theme";
import { getRankTitle, type RankTier } from "../../lib/gamification";

const TIER_COLOR: Record<RankTier, string> = {
  Bronze: colors.tierBronze,
  Silver: colors.tierSilver,
  Gold: colors.tierGold,
  Platinum: colors.tierPlatinum,
  Diamond: colors.tierDiamond,
};

type Props = {
  level: number;
};

export function RankTitle({ level }: Props) {
  const tier = getRankTitle(level);
  const color = TIER_COLOR[tier];

  return (
    <View style={[styles.chip, { borderColor: `${color}88`, backgroundColor: `${color}1a` }]}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={[styles.text, { color }]}>{tier}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    alignSelf: "flex-start",
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingVertical: 4,
    paddingHorizontal: spacing.sm + 2,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  text: {
    ...typography.caption,
    fontWeight: "800",
  },
});
