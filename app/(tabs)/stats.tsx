import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { ShareStatsButton } from "../../components/share/ShareStatsButton";
import { Card } from "../../components/ui/Card";
import { ContributionGraph } from "../../components/ui/ContributionGraph";
import { Donut } from "../../components/ui/Donut";
import { EmptyState } from "../../components/ui/EmptyState";
import { Flag } from "../../components/ui/Flag";
import { Screen } from "../../components/ui/Screen";
import { SectionHeader } from "../../components/ui/SectionHeader";
import { StatTile } from "../../components/ui/StatTile";
import { colors, radius, spacing, typography } from "../../constants/theme";
import { useLayout } from "../../hooks/useLayout";
import { useScanHistory } from "../../hooks/useScanHistory";
import { buildDailyCounts } from "../../lib/gamification";
import { openCountry } from "../../lib/navigation";
import type { ScanRecord } from "../../lib/types";

const RECENT_LIMIT = 40;

const dayKey = (iso: string) => new Date(iso).toLocaleDateString("en-CA");

function dayLabel(key: string): string {
  const today = new Date().toLocaleDateString("en-CA");
  const y = new Date();
  y.setDate(y.getDate() - 1);
  if (key === today) return "Today";
  if (key === y.toLocaleDateString("en-CA")) return "Yesterday";
  const [yy, mm, dd] = key.split("-").map(Number);
  return new Date(yy, mm - 1, dd).toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" });
}

const timeOf = (iso: string) => new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });

function HistoryRow({ item, last }: { item: ScanRecord; last: boolean }) {
  return (
    <Pressable
      onPress={() => openCountry(item.country)}
      style={({ pressed }) => [styles.historyItem, !last && styles.divider, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={`${item.country}, ${item.isPositive ? "positive" : "negative"}, ${timeOf(item.scannedAt)}`}
      accessibilityHint="Opens country details"
    >
      <Flag country={item.country} size={22} />
      <View style={styles.historyMain}>
        <Text style={styles.historyCountry} numberOfLines={1}>
          {item.country}
        </Text>
        <Text style={styles.historyCode}>{item.code}</Text>
      </View>
      <View style={styles.historyRight}>
        <View style={[styles.tonePill, { backgroundColor: item.isPositive ? "rgba(74,222,155,0.14)" : "rgba(251,113,133,0.14)" }]}>
          <Text style={[styles.historyTone, { color: item.isPositive ? colors.positive : colors.negative }]}>
            {item.isPositive ? "Positive" : "Negative"}
          </Text>
        </View>
        <Text style={styles.historyTime}>{timeOf(item.scannedAt)}</Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={colors.muted} />
    </Pressable>
  );
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

  const groups = useMemo(() => {
    const out: { key: string; items: ScanRecord[] }[] = [];
    for (const s of scans.slice(0, RECENT_LIMIT)) {
      const key = dayKey(s.scannedAt);
      const last = out[out.length - 1];
      if (last && last.key === key) last.items.push(s);
      else out.push({ key, items: [s] });
    }
    return out;
  }, [scans]);

  const overview = (
    <Card>
      <SectionHeader title="Overview" caption={stats.total ? `${stats.total.toLocaleString()} scans in total` : undefined} />
      <View style={styles.overview}>
        <Donut
          size={124}
          segments={[
            { value: stats.positive, color: colors.positive },
            { value: stats.negative, color: colors.negative },
          ]}
          label={stats.total ? `${positiveShare}%` : "–"}
          caption="positive"
        />
        <View style={styles.overviewStats}>
          {[
            { label: "Positive", value: stats.positive, color: colors.positive },
            { label: "Negative", value: stats.negative, color: colors.negative },
            { label: "Countries", value: new Set(scans.map((s) => s.country)).size, color: colors.accent },
          ].map((row) => (
            <View key={row.label} style={styles.overviewRow}>
              <View style={[styles.legendDot, { backgroundColor: row.color }]} />
              <Text style={styles.overviewLabel}>{row.label}</Text>
              <Text style={styles.overviewValue}>{row.value.toLocaleString()}</Text>
            </View>
          ))}
        </View>
      </View>
    </Card>
  );

  const tiles = (
    <View style={styles.tileRow}>
      <StatTile label="Current streak" value={`${gamification.currentStreak}d`} icon="flame" tone="gold" />
      <StatTile label="Longest streak" value={`${gamification.longestStreak}d`} icon="podium" tone="gold" />
      <StatTile label="Level" value={gamification.level} icon="star" tone="accent" />
    </View>
  );

  const recent = (
    <Card padded={false}>
      <View style={styles.cardHead}>
        <SectionHeader
          title="History"
          caption={scans.length > RECENT_LIMIT ? `Latest ${RECENT_LIMIT} of ${scans.length.toLocaleString()}` : undefined}
        />
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
        groups.map((group) => (
          <View key={group.key}>
            <Text style={styles.dayLabel}>{dayLabel(group.key)}</Text>
            {group.items.map((item, i) => (
              <HistoryRow key={item.id} item={item} last={i === group.items.length - 1} />
            ))}
          </View>
        ))
      )}
    </Card>
  );

  const top =
    topCountries.length > 0 ? (
      <Card padded={false}>
        <View style={styles.cardHead}>
          <SectionHeader title="Most scanned" />
        </View>
        {topCountries.map(([country, count], i) => (
          <Pressable
            key={country}
            onPress={() => openCountry(country)}
            style={({ pressed }) => [styles.topRow, i < topCountries.length - 1 && styles.divider, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel={`${country}, ${count} scans`}
          >
            <Text style={styles.topRank}>{i + 1}</Text>
            <Flag country={country} size={18} />
            <View style={styles.topMain}>
              <Text style={styles.topCountry} numberOfLines={1}>
                {country}
              </Text>
              <View style={styles.topBarTrack}>
                <View style={[styles.topBarFill, { width: `${(count / topCountries[0][1]) * 100}%` }]} />
              </View>
            </View>
            <Text style={styles.topCount}>{count}</Text>
          </Pressable>
        ))}
      </Card>
    ) : null;

  const share = scans.length > 0 ? <ShareStatsButton scans={scans} gamification={gamification} stats={stats} /> : null;

  return (
    <Screen
      title="Stats"
      subtitle="Your activity. Stored only on this device."
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
            {overview}
            {tiles}
            {share}
            {top}
          </View>
          <View style={styles.splitCol}>{recent}</View>
        </View>
      ) : (
        <>
          {overview}
          {tiles}
          {share}
          {top}
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
  overview: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xl,
  },
  overviewStats: {
    flex: 1,
    gap: spacing.md,
  },
  overviewRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  overviewLabel: {
    ...typography.body,
    color: colors.subtext,
    flex: 1,
  },
  overviewValue: {
    ...typography.bodyStrong,
    color: colors.text,
    fontVariant: ["tabular-nums"],
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
  cardHead: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  emptyWrap: {
    padding: spacing.lg,
    paddingTop: 0,
  },
  dayLabel: {
    ...typography.overline,
    color: colors.muted,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
  historyItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    minHeight: 60,
  },
  pressed: {
    backgroundColor: colors.panel,
  },
  divider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
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
    gap: 4,
  },
  tonePill: {
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  historyTone: {
    ...typography.caption,
    fontSize: 11.5,
    fontWeight: "800",
  },
  historyTime: {
    ...typography.caption,
    color: colors.muted,
    fontWeight: "500",
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  topRank: {
    ...typography.caption,
    color: colors.muted,
    width: 14,
    textAlign: "center",
  },
  topMain: {
    flex: 1,
    gap: 6,
  },
  topCountry: {
    ...typography.body,
    fontWeight: "600",
    color: colors.text,
  },
  topBarTrack: {
    height: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.panelStrong,
    overflow: "hidden",
  },
  topBarFill: {
    height: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.accent,
  },
  topCount: {
    ...typography.bodyStrong,
    color: colors.text,
    minWidth: 28,
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
