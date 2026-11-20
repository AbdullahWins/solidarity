import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { ShareStatsButton } from "../../components/share/ShareStatsButton";
import { Card } from "../../components/ui/Card";
import { ContributionGraph } from "../../components/ui/ContributionGraph";
import { EmptyState } from "../../components/ui/EmptyState";
import { Screen } from "../../components/ui/Screen";
import { SectionHeader } from "../../components/ui/SectionHeader";
import { StatTile } from "../../components/ui/StatTile";
import { colors, radius, spacing, typography } from "../../constants/theme";
import { useLayout } from "../../hooks/useLayout";
import { useScanHistory } from "../../hooks/useScanHistory";
import { buildDailyCounts } from "../../lib/gamification";

const RECENT_LIMIT = 40;

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.round(diff / 60000);
  if (min < 1) return "Just now";
  if (min < 60) return `${min} min ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr} h ago`;
  const d = Math.round(hr / 24);
  if (d < 7) return `${d} d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function StatsScreen() {
  const { scans, stats, gamification, reload } = useScanHistory();
  const dailyCounts = useMemo(() => buildDailyCounts(scans), [scans]);
  const { columns } = useLayout();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await reload();
    setRefreshing(false);
  };

  const positiveShare = stats.total > 0 ? Math.round((stats.positive / stats.total) * 100) : 0;

  const topCountries = useMemo(() => {
    const counts = new Map<string, number>();
    for (const s of scans) counts.set(s.country, (counts.get(s.country) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [scans]);

  const tiles = (
    <View style={styles.tiles}>
      <View style={styles.tileRow}>
        <StatTile label="Total scans" value={stats.total} icon="scan" tone="accent" />
        <StatTile label="Positive" value={stats.positive} icon="checkmark-circle" tone="positive" />
        <StatTile label="Negative" value={stats.negative} icon="alert-circle" tone="negative" />
      </View>
      <View style={styles.tileRow}>
        <StatTile label="Current streak" value={`${gamification.currentStreak}d`} icon="flame" tone="gold" />
        <StatTile label="Longest streak" value={`${gamification.longestStreak}d`} icon="podium" tone="gold" />
        <StatTile label="Positive share" value={`${positiveShare}%`} icon="pie-chart" />
      </View>
    </View>
  );

  const recent = (
    <Card padded={false}>
      <View style={styles.recentHeader}>
        <SectionHeader title="Recent scans" caption={scans.length > RECENT_LIMIT ? `Latest ${RECENT_LIMIT} of ${scans.length}` : undefined} />
      </View>
      {scans.length === 0 ? (
        <View style={styles.emptyWrap}>
          <EmptyState
            icon="scan-outline"
            title="No scans yet"
            text="Scan a product to start building your history."
            actionLabel="Start scanning"
            onAction={() => router.navigate("/")}
          />
        </View>
      ) : (
        scans.slice(0, RECENT_LIMIT).map((item, i) => (
          <View
            key={item.id}
            style={[styles.historyItem, i < Math.min(scans.length, RECENT_LIMIT) - 1 && styles.divider]}
            accessible
            accessibilityLabel={`${item.country}, ${item.isPositive ? "positive" : "negative"}, ${relativeTime(item.scannedAt)}`}
          >
            <View style={[styles.dot, { backgroundColor: item.isPositive ? colors.positive : colors.negative }]} />
            <View style={styles.historyMain}>
              <Text style={styles.historyCountry} numberOfLines={1}>
                {item.country}
              </Text>
              <Text style={styles.historyCode}>{item.code}</Text>
            </View>
            <View style={styles.historyRight}>
              <Text style={[styles.historyTone, { color: item.isPositive ? colors.positive : colors.negative }]}>
                {item.isPositive ? "Positive" : "Negative"}
              </Text>
              <Text style={styles.historyTime}>{relativeTime(item.scannedAt)}</Text>
            </View>
          </View>
        ))
      )}
    </Card>
  );

  const insights =
    topCountries.length > 0 ? (
      <Card>
        <SectionHeader title="Most scanned" />
        {topCountries.map(([country, count]) => (
          <View key={country} style={styles.topRow}>
            <Text style={styles.topCountry} numberOfLines={1}>
              {country}
            </Text>
            <View style={styles.topBarTrack}>
              <View style={[styles.topBarFill, { width: `${(count / topCountries[0][1]) * 100}%` }]} />
            </View>
            <Text style={styles.topCount}>{count}</Text>
          </View>
        ))}
      </Card>
    ) : null;

  return (
    <Screen
      title="Stats"
      subtitle="Your scanning activity, all stored on this device."
      width={columns > 1 ? "wide" : "readable"}
      refreshing={refreshing}
      onRefresh={onRefresh}
    >
      <Card>
        <SectionHeader title="Daily activity" />
        <ContributionGraph dailyCounts={dailyCounts} />
      </Card>

      {columns > 1 ? (
        <View style={styles.split}>
          <View style={styles.splitCol}>
            {tiles}
            {scans.length > 0 && <ShareStatsButton scans={scans} gamification={gamification} stats={stats} />}
            {insights}
          </View>
          <View style={styles.splitCol}>{recent}</View>
        </View>
      ) : (
        <>
          {tiles}
          {scans.length > 0 && <ShareStatsButton scans={scans} gamification={gamification} stats={stats} />}
          {insights}
          {recent}
        </>
      )}

      {scans.length === 0 ? (
        <View style={styles.privacy}>
          <Ionicons name="lock-closed-outline" size={14} color={colors.muted} />
          <Text style={styles.privacyText}>Scan history never leaves your device.</Text>
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  tiles: {
    gap: spacing.sm,
  },
  tileRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  split: {
    flexDirection: "row",
    gap: spacing.lg,
    alignItems: "flex-start",
  },
  splitCol: {
    flex: 1,
    gap: spacing.lg,
  },
  recentHeader: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  emptyWrap: {
    padding: spacing.lg,
    paddingTop: 0,
  },
  historyItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  divider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  historyMain: {
    flex: 1,
  },
  historyCountry: {
    ...typography.bodyStrong,
    color: colors.text,
  },
  historyCode: {
    ...typography.mono,
    fontSize: 12,
    color: colors.muted,
    marginTop: 2,
  },
  historyRight: {
    alignItems: "flex-end",
  },
  historyTone: {
    ...typography.caption,
    fontWeight: "800",
  },
  historyTime: {
    ...typography.caption,
    color: colors.muted,
    fontWeight: "500",
    marginTop: 2,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  topCountry: {
    ...typography.body,
    color: colors.text,
    width: 120,
  },
  topBarTrack: {
    flex: 1,
    height: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.panelStrong,
    overflow: "hidden",
  },
  topBarFill: {
    height: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.accent,
  },
  topCount: {
    ...typography.caption,
    color: colors.subtext,
    width: 32,
    textAlign: "right",
    fontVariant: ["tabular-nums"],
  },
  privacy: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
  },
  privacyText: {
    ...typography.caption,
    color: colors.muted,
  },
});
