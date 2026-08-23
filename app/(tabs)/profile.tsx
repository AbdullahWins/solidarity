import { Ionicons } from "@expo/vector-icons";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { ShareStatsButton } from "../../components/share/ShareStatsButton";
import { Badge } from "../../components/ui/Badge";
import { Card } from "../../components/ui/Card";
import { ProgressBar } from "../../components/ui/ProgressBar";
import { ScreenContainer } from "../../components/ui/ScreenContainer";
import { SectionHeader } from "../../components/ui/SectionHeader";
import { colors, spacing, typography } from "../../constants/theme";
import { useScanHistory } from "../../hooks/useScanHistory";
import { badgeDefinitions } from "../../lib/badges";
import { levelProgress } from "../../lib/gamification";

export default function ProfileScreen() {
  const { scans, gamification, stats } = useScanHistory();
  const { level, progress, nextThreshold } = levelProgress(gamification.xp);

  return (
    <>
      <Stack.Screen options={{ title: "Profile" }} />
      <ScreenContainer>
        <StatusBar style="light" />
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Card style={styles.levelCard}>
            <Text style={styles.levelValue}>Level {level}</Text>
            <ProgressBar progress={progress} />
            <Text style={styles.xpText}>
              {gamification.xp} XP · {Math.max(nextThreshold - gamification.xp, 0)} to next level
            </Text>
            <View style={styles.streakRow}>
              <Ionicons name="flame" size={20} color={colors.gold} />
              <Text style={styles.streakText}>
                {gamification.currentStreak}-day streak (best {gamification.longestStreak}d)
              </Text>
            </View>
          </Card>

          {scans.length > 0 && (
            <ShareStatsButton scans={scans} gamification={gamification} stats={stats} />
          )}

          <Card>
            <SectionHeader title="Achievements" />
            <View style={styles.badgeGrid}>
              {badgeDefinitions.map((badge) => (
                <Badge
                  key={badge.id}
                  badge={badge}
                  unlocked={gamification.unlockedBadgeIds.includes(badge.id)}
                />
              ))}
            </View>
          </Card>
        </ScrollView>
      </ScreenContainer>
    </>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },
  levelCard: {
    gap: spacing.sm,
  },
  levelValue: {
    ...typography.display,
    color: colors.gold,
  },
  xpText: {
    ...typography.caption,
    color: colors.subtext,
  },
  streakRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  streakText: {
    ...typography.body,
    color: colors.text,
    fontWeight: "700",
  },
  badgeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
});
