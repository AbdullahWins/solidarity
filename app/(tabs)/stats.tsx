import { Stack } from "expo-router";
import React, { useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";

import { ShareStatsButton } from "../../components/share/ShareStatsButton";
import { Card } from "../../components/ui/Card";
import { ContributionGraph } from "../../components/ui/ContributionGraph";
import { EmptyState } from "../../components/ui/EmptyState";
import { ScreenContainer } from "../../components/ui/ScreenContainer";
import { SectionHeader } from "../../components/ui/SectionHeader";
import { StatTile } from "../../components/ui/StatTile";
import { colors, spacing } from "../../constants/theme";
import { useScanHistory } from "../../hooks/useScanHistory";
import { buildDailyCounts } from "../../lib/gamification";

export default function StatsScreen() {
  const { scans, stats, gamification, reload } = useScanHistory();
  const dailyCounts = buildDailyCounts(scans);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await reload();
    setRefreshing(false);
  };

  return (
    <>
      <Stack.Screen options={{ title: "Stats" }} />
      <ScreenContainer>
        <StatusBar style="light" />
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.text} />
          }
        >
          <Card>
            <SectionHeader title="Daily activity" />
            <ContributionGraph dailyCounts={dailyCounts} />
          </Card>

          <View style={styles.statsRow}>
            <StatTile label="Total scans" value={stats.total} />
            <StatTile label="Positive" value={stats.positive} tone="positive" />
            <StatTile label="Negative" value={stats.negative} tone="negative" />
          </View>

          <View style={styles.statsRow}>
            <StatTile label="Current streak" value={`${gamification.currentStreak}d`} />
            <StatTile label="Longest streak" value={`${gamification.longestStreak}d`} />
          </View>

          {scans.length > 0 && (
            <ShareStatsButton scans={scans} gamification={gamification} stats={stats} />
          )}

          <Card>
            <SectionHeader title="Recent scans" />
            {scans.length === 0 ? (
              <EmptyState text="No scans yet. Use the Scan tab to get started." />
            ) : (
              scans.slice(0, 40).map((item) => (
                <View key={item.id} style={styles.historyItem}>
                  <View style={styles.historyLeft}>
                    <Text style={styles.historyCountry}>{item.country}</Text>
                    <Text style={styles.historyCode}>{item.code}</Text>
                  </View>
                  <View style={styles.historyRight}>
                    <Text
                      style={[
                        styles.historyTone,
                        item.isPositive ? styles.positiveTone : styles.negativeTone,
                      ]}
                    >
                      {item.isPositive ? "Positive" : "Negative"}
                    </Text>
                    <Text style={styles.historyTime}>
                      {new Date(item.scannedAt).toLocaleString()}
                    </Text>
                  </View>
                </View>
              ))
            )}
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
  statsRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  historyItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    backgroundColor: colors.panelSoft,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    marginTop: spacing.sm,
  },
  historyLeft: {
    flexShrink: 1,
  },
  historyCountry: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "700",
  },
  historyCode: {
    color: colors.subtext,
    fontSize: 12,
    marginTop: 2,
  },
  historyRight: {
    alignItems: "flex-end",
  },
  historyTone: {
    fontSize: 12,
    fontWeight: "800",
  },
  positiveTone: { color: colors.positive },
  negativeTone: { color: colors.negative },
  historyTime: {
    marginTop: 3,
    color: colors.subtext,
    fontSize: 11,
  },
});
