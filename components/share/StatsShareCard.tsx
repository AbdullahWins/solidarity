import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { ContributionGraph } from "../ui/ContributionGraph";
import { Flag } from "../ui/Flag";
import { APP_NAME, LINKS } from "../../constants/app-info";
import { colors, gradients, radius, spacing, typography } from "../../constants/theme";
import { badgeDefinitions } from "../../lib/badges";
import { getRankTitle, levelProgress } from "../../lib/gamification";
import type { GamificationState } from "../../lib/types";

type Props = {
  gamification: GamificationState;
  stats: { total: number; positive: number; negative: number };
  dailyCounts: Record<string, number>;
  topCountries?: string[];
  onReady?: () => void;
};

const logo = require("../../assets/images/logo.png");

/** Fixed-size card rendered off-screen and captured as the shareable image. */
export function StatsShareCard({ gamification, stats, dailyCounts, topCountries = [], onReady }: Props) {
  const { level, progress } = levelProgress(gamification.xp);
  const unlockedBadges = badgeDefinitions.filter((b) => gamification.unlockedBadgeIds.includes(b.id)).slice(0, 5);

  return (
    <View style={styles.card} collapsable={false}>
      <LinearGradient colors={["#1A1310", "#0E1015", "#0B0C12"]} style={StyleSheet.absoluteFill} />
      <LinearGradient
        colors={["rgba(240, 100, 60, 0.35)", "rgba(240, 100, 60, 0)"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.8, y: 0.6 }}
        style={StyleSheet.absoluteFill}
      />

      <View style={styles.header}>
        <Image source={logo} style={styles.logo} onLoad={onReady} onError={onReady} cachePolicy="memory" />
        <Text style={styles.appName}>{APP_NAME}</Text>
        <Text style={styles.rank}>{getRankTitle(level)}</Text>
      </View>

      <View>
        <Text style={styles.levelLabel}>Level {level}</Text>
        <Text style={styles.xp}>{gamification.xp.toLocaleString()} XP</Text>
      </View>
      <View style={styles.progressTrack}>
        <LinearGradient
          colors={[colors.goldStrong, colors.gold]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.progressFill, { width: `${Math.max(progress, 0.02) * 100}%` }]}
        />
      </View>

      <View style={styles.statsRow}>
        {[
          { label: "Scans", value: stats.total, color: colors.text },
          { label: "Streak", value: `${gamification.currentStreak}d`, color: colors.gold },
          { label: "Positive", value: stats.positive, color: colors.positive },
          { label: "Negative", value: stats.negative, color: colors.negative },
        ].map((s) => (
          <View key={s.label} style={styles.statTile}>
            <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
            <Text style={styles.statLabel}>{s.label}</Text>
          </View>
        ))}
      </View>

      <View style={styles.graphWrap}>
        <ContributionGraph
          dailyCounts={dailyCounts}
          weeksToShow={17}
          cellSize={14}
          showMonthLabels={false}
          interactive={false}
        />
      </View>

      {topCountries.length > 0 && (
        <View style={styles.topRow}>
          <Text style={styles.topLabel}>Most scanned</Text>
          <View style={styles.topFlags}>
            {topCountries.map((c) => (
              <View key={c} style={styles.topItem}>
                <Flag country={c} size={16} />
                <Text style={styles.topName} numberOfLines={1}>
                  {c}
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {unlockedBadges.length > 0 && (
        <View style={styles.badgeRow}>
          {unlockedBadges.map((badge) => (
            <LinearGradient key={badge.id} colors={gradients.gold} style={styles.badgeIconWrap}>
              <Ionicons name={badge.icon} size={18} color={colors.gold} />
            </LinearGradient>
          ))}
        </View>
      )}

      <View style={styles.footer}>
        <Text style={styles.footerText}>Know what you buy · {LINKS.website.replace(/^https:\/\//, "").replace(/\/$/, "")}</Text>
      </View>
    </View>
  );
}

const CARD_WIDTH = 380;

const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    borderRadius: radius.xxl,
    padding: spacing.xl,
    gap: spacing.lg,
    overflow: "hidden",
    backgroundColor: colors.bg,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  logo: {
    width: 32,
    height: 32,
    borderRadius: 9,
  },
  appName: {
    ...typography.heading,
    color: colors.text,
    flex: 1,
  },
  rank: {
    ...typography.overline,
    color: colors.gold,
  },
  levelLabel: {
    ...typography.hero,
    color: colors.text,
  },
  xp: {
    ...typography.bodyStrong,
    color: colors.gold,
  },
  progressTrack: {
    width: "100%",
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.panelStrong,
    overflow: "hidden",
  },
  progressFill: {
    height: 10,
    borderRadius: 5,
  },
  statsRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  statTile: {
    flex: 1,
    backgroundColor: colors.panel,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: "center",
  },
  statValue: {
    ...typography.heading,
    fontVariant: ["tabular-nums"],
  },
  statLabel: {
    ...typography.caption,
    color: colors.subtext,
    marginTop: 2,
  },
  graphWrap: {
    alignItems: "center",
  },
  topRow: {
    gap: spacing.sm,
  },
  topLabel: {
    ...typography.overline,
    color: colors.subtext,
  },
  topFlags: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  topItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.panel,
    borderRadius: radius.pill,
    paddingVertical: 5,
    paddingHorizontal: 10,
    maxWidth: 160,
  },
  topName: {
    ...typography.caption,
    color: colors.text,
    flexShrink: 1,
  },
  badgeRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  badgeIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  footer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderStrong,
    paddingTop: spacing.md,
  },
  footerText: {
    ...typography.caption,
    color: colors.subtext,
  },
});
