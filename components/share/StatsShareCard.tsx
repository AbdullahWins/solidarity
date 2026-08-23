import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Image, StyleSheet, Text, View } from "react-native";

import { ContributionGraph } from "../ui/ContributionGraph";
import { APP_NAME, APP_SHARE_URL } from "../../constants/app-info";
import { colors, radius, spacing, typography } from "../../constants/theme";
import { badgeDefinitions } from "../../lib/badges";
import { levelProgress } from "../../lib/gamification";
import type { GamificationState } from "../../lib/types";

type Props = {
  gamification: GamificationState;
  stats: { total: number; positive: number; negative: number };
  dailyCounts: Record<string, number>;
};

export function StatsShareCard({ gamification, stats, dailyCounts }: Props) {
  const { level, progress } = levelProgress(gamification.xp);
  const unlockedBadges = badgeDefinitions.filter((b) =>
    gamification.unlockedBadgeIds.includes(b.id)
  ).slice(0, 4);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Image
          source={require("../../assets/images/icon.png")}
          style={styles.logo}
        />
        <Text style={styles.appName}>{APP_NAME}</Text>
      </View>

      <Text style={styles.levelLabel}>Level {level}</Text>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
      </View>

      <View style={styles.streakRow}>
        <Ionicons name="flame" size={22} color={colors.gold} />
        <Text style={styles.streakText}>{gamification.currentStreak}-day streak</Text>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statTile}>
          <Text style={styles.statValue}>{stats.total}</Text>
          <Text style={styles.statLabel}>Scans</Text>
        </View>
        <View style={styles.statTile}>
          <Text style={[styles.statValue, { color: colors.positive }]}>{stats.positive}</Text>
          <Text style={styles.statLabel}>Positive</Text>
        </View>
        <View style={styles.statTile}>
          <Text style={[styles.statValue, { color: colors.negative }]}>{stats.negative}</Text>
          <Text style={styles.statLabel}>Negative</Text>
        </View>
      </View>

      <View style={styles.graphWrap}>
        <ContributionGraph
          dailyCounts={dailyCounts}
          weeksToShow={12}
          cellSize={12}
          showMonthLabels={false}
          interactive={false}
        />
      </View>

      {unlockedBadges.length > 0 && (
        <View style={styles.badgeRow}>
          {unlockedBadges.map((badge) => (
            <View key={badge.id} style={styles.badgeIconWrap}>
              <Ionicons name={badge.icon} size={18} color={colors.gold} />
            </View>
          ))}
        </View>
      )}

      <View style={styles.footer}>
        <Text style={styles.footerText}>Tracked with {APP_NAME}</Text>
        <Text style={styles.footerLink}>{APP_SHARE_URL.replace("https://", "")}</Text>
      </View>
    </View>
  );
}

const CARD_WIDTH = 360;

const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    backgroundColor: colors.bg,
    borderRadius: radius.xl,
    padding: spacing.xl,
    gap: spacing.md,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  logo: {
    width: 28,
    height: 28,
    borderRadius: 8,
  },
  appName: {
    ...typography.heading,
    color: colors.text,
  },
  levelLabel: {
    ...typography.display,
    color: colors.gold,
  },
  progressTrack: {
    width: "100%",
    height: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.panelSoft,
    overflow: "hidden",
  },
  progressFill: {
    height: 8,
    backgroundColor: colors.gold,
    borderRadius: radius.pill,
  },
  streakRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  streakText: {
    ...typography.body,
    color: colors.text,
    fontWeight: "700",
  },
  statsRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  statTile: {
    flex: 1,
    backgroundColor: colors.panel,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    alignItems: "center",
  },
  statValue: {
    ...typography.heading,
    color: colors.text,
  },
  statLabel: {
    ...typography.caption,
    color: colors.subtext,
    marginTop: 2,
  },
  graphWrap: {
    alignItems: "flex-start",
  },
  badgeRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  badgeIconWrap: {
    width: 34,
    height: 34,
    borderRadius: radius.pill,
    backgroundColor: `${colors.gold}22`,
    alignItems: "center",
    justifyContent: "center",
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
  },
  footerText: {
    ...typography.caption,
    color: colors.subtext,
  },
  footerLink: {
    ...typography.caption,
    color: colors.accent,
    marginTop: 2,
  },
});
