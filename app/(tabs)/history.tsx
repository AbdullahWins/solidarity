import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { AccountButton } from "../../components/navigation/AccountButton";
import { ShareStatsButton } from "../../components/share/ShareStatsButton";
import { Card } from "../../components/ui/Card";
import { ContributionGraph } from "../../components/ui/ContributionGraph";
import { Donut } from "../../components/ui/Donut";
import { EmptyState } from "../../components/ui/EmptyState";
import { Flag } from "../../components/ui/Flag";
import { Screen } from "../../components/ui/Screen";
import { SearchField } from "../../components/ui/SearchField";
import { SectionHeader } from "../../components/ui/SectionHeader";
import { StatTile } from "../../components/ui/StatTile";
import { colors, radius, spacing, typography } from "../../constants/theme";
import { useLayout } from "../../hooks/useLayout";
import { usePreferences } from "../../hooks/usePreferences";
import { useScanHistory } from "../../hooks/useScanHistory";
import { buildDailyCounts } from "../../lib/gamification";
import { hapticSelection } from "../../lib/haptics";
import {
  filterScans,
  isFiltered,
  NO_FILTER,
  toneOf,
  type PeriodFilter,
  type ToneFilter,
} from "../../lib/historyFilter";
import { openCountry } from "../../lib/navigation";
import type { ScanRecord } from "../../lib/types";

const RECENT_LIMIT = 40;

const TONES: { key: ToneFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "fine", label: "Fine" },
  { key: "avoid", label: "Avoid" },
  { key: "neutral", label: "Neutral" },
];
const PERIODS: { key: PeriodFilter; label: string }[] = [
  { key: "all", label: "Any time" },
  { key: "today", label: "Today" },
  { key: "7d", label: "7 days" },
  { key: "30d", label: "30 days" },
];

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
  // A personal rule at scan time leads; otherwise the community verdict then.
  const tone = toneOf(item);
  const toneColor = tone === "fine" ? colors.positive : tone === "avoid" ? colors.negative : colors.subtext;
  const toneBg = tone === "fine" ? "rgba(74,222,155,0.14)" : tone === "avoid" ? "rgba(251,113,133,0.14)" : colors.panel;
  const personal = item.brandRule?.rule ?? item.rule;
  const label = personal ? (personal === "support" ? "Support" : "Avoid") : tone === "fine" ? "Fine" : tone === "avoid" ? "Avoid" : "Neutral";
  return (
    <Pressable
      onPress={() => openCountry(item.country)}
      style={({ pressed }) => [styles.historyItem, !last && styles.divider, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={`${item.productName ? `${item.productName}, ` : ""}${item.country}, ${item.rule ? `your rule: ${label}` : label.toLowerCase()}, ${timeOf(item.scannedAt)}`}
      accessibilityHint="Opens country details"
    >
      <Flag country={item.country} size={22} />
      <View style={styles.historyMain}>
        <Text style={styles.historyCountry} numberOfLines={1}>
          {item.productName ?? item.country}
        </Text>
        {item.productName ? (
          <Text style={styles.historySub} numberOfLines={1}>
            {[item.brand, item.owner && `owned by ${item.owner}`, item.country].filter(Boolean).join(" · ")}
          </Text>
        ) : (
          <Text style={styles.historyCode}>{item.code}</Text>
        )}
      </View>
      <View style={styles.historyRight}>
        <View style={[styles.tonePill, { backgroundColor: toneBg }]}>
          {personal ? <Ionicons name="person" size={10} color={toneColor} /> : null}
          <Text style={[styles.historyTone, { color: toneColor }]}>{label}</Text>
        </View>
        <Text style={styles.historyTime}>{timeOf(item.scannedAt)}</Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={colors.muted} />
    </Pressable>
  );
}

export default function HistoryScreen() {
  const { scans, stats, gamification, reload } = useScanHistory();
  const dailyCounts = useMemo(() => buildDailyCounts(scans), [scans]);
  const { columns } = useLayout();
  const { preferences, update } = usePreferences();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await reload();
    setRefreshing(false);
  };

  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [tone, setTone] = useState<ToneFilter>("all");
  const [period, setPeriod] = useState<PeriodFilter>("all");
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 150);
    return () => clearTimeout(t);
  }, [query]);
  const filter = useMemo(() => ({ query: debouncedQuery, tone, period }), [debouncedQuery, tone, period]);
  const filtering = isFiltered(filter);
  const filtered = useMemo(() => filterScans(scans, filter), [scans, filter]);
  const clearFilters = () => {
    setQuery("");
    setDebouncedQuery("");
    setTone(NO_FILTER.tone);
    setPeriod(NO_FILTER.period);
  };

  // The summary describes whatever is listed (the filtered set when filtering).
  const counts = useMemo(() => {
    let fine = 0;
    let avoid = 0;
    for (const s of filtered) {
      const t = toneOf(s);
      if (t === "fine") fine += 1;
      else if (t === "avoid") avoid += 1;
    }
    return { total: filtered.length, fine, avoid };
  }, [filtered]);
  const positiveShare = counts.fine + counts.avoid > 0 ? Math.round((counts.fine / (counts.fine + counts.avoid)) * 100) : 0;

  const topCountries = useMemo(() => {
    const counts = new Map<string, number>();
    for (const s of scans) counts.set(s.country, (counts.get(s.country) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [scans]);

  const groups = useMemo(() => {
    const out: { key: string; items: ScanRecord[] }[] = [];
    for (const s of filtered.slice(0, RECENT_LIMIT)) {
      const key = dayKey(s.scannedAt);
      const last = out[out.length - 1];
      if (last && last.key === key) last.items.push(s);
      else out.push({ key, items: [s] });
    }
    return out;
  }, [filtered]);

  const summary = (
    <Card>
      <View style={styles.overview}>
        <Donut
          size={104}
          segments={[
            { value: counts.fine, color: colors.positive },
            { value: counts.avoid, color: colors.negative },
          ]}
          label={counts.fine + counts.avoid ? `${positiveShare}%` : "–"}
          caption="positive"
        />
        <View style={styles.overviewStats}>
          {[
            { label: filtering ? "Matching" : "Scans", value: counts.total.toLocaleString(), color: colors.accent },
            { label: "Fine", value: counts.fine.toLocaleString(), color: colors.positive },
            { label: "Avoid", value: counts.avoid.toLocaleString(), color: colors.negative },
            { label: "Streak", value: `${gamification.currentStreak}d`, color: colors.gold },
          ].map((row) => (
            <View key={row.label} style={styles.overviewRow}>
              <View style={[styles.legendDot, { backgroundColor: row.color }]} />
              <Text style={styles.overviewLabel}>{row.label}</Text>
              <Text style={styles.overviewValue}>{row.value}</Text>
            </View>
          ))}
        </View>
      </View>
    </Card>
  );

  const chip = (label: string, active: boolean, onPress: () => void) => (
    <Pressable
      key={label}
      onPress={() => {
        if (!active) {
          hapticSelection();
          onPress();
        }
      }}
      style={[styles.chip, active && styles.chipActive]}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
    >
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  );

  const controls = (
    <View style={styles.controls}>
      <SearchField value={query} onChangeText={setQuery} placeholder="Search country, product or barcode" />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        {TONES.map((t) => chip(t.label, tone === t.key, () => setTone(t.key)))}
        <View style={styles.chipGap} />
        {PERIODS.map((p) => chip(p.label, period === p.key, () => setPeriod(p.key)))}
      </ScrollView>
    </View>
  );

  const list =
    filtered.length === 0 ? (
      <EmptyState
        icon="search-outline"
        title="No matching scans"
        text="Try another search or fewer filters."
        actionLabel="Clear filters"
        onAction={clearFilters}
      />
    ) : (
    <Card padded={false}>
      {filtered.length > RECENT_LIMIT ? (
        <Text style={styles.listCaption}>{`Latest ${RECENT_LIMIT} of ${filtered.length.toLocaleString()}`}</Text>
      ) : null}
      {groups.map((group) => (
        <View key={group.key}>
          <Text style={styles.dayLabel}>{dayLabel(group.key)}</Text>
          {group.items.map((item, i) => (
            <HistoryRow key={item.id} item={item} last={i === group.items.length - 1} />
          ))}
        </View>
      ))}
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

  const moreOpen = preferences.historyMoreStatsOpen;
  const more = (
    <View style={styles.more}>
      <Pressable
        onPress={() => void update({ historyMoreStatsOpen: !moreOpen })}
        style={({ pressed }) => [styles.moreToggle, pressed && { opacity: 0.7 }]}
        accessibilityRole="button"
        accessibilityState={{ expanded: moreOpen }}
        accessibilityLabel="More stats"
      >
        <Text style={styles.moreLabel}>More stats</Text>
        <Ionicons name={moreOpen ? "chevron-up" : "chevron-down"} size={18} color={colors.subtext} />
      </Pressable>
      {moreOpen ? (
        <View style={styles.moreBody}>
          <Card>
            <SectionHeader title="Daily activity" />
            <ContributionGraph dailyCounts={dailyCounts} />
          </Card>
          <View style={styles.tileRow}>
            <StatTile label="Longest streak" value={`${gamification.longestStreak}d`} icon="podium" tone="gold" />
            <StatTile label="Level" value={gamification.level} icon="star" tone="accent" />
            <StatTile label="Countries" value={new Set(scans.map((s) => s.country)).size} icon="flag" tone="accent" />
          </View>
          {top}
          <ShareStatsButton scans={scans} gamification={gamification} stats={stats} />
        </View>
      ) : null}
    </View>
  );

  return (
    <Screen
      title="History"
      subtitle="Stored only on this device."
      headerRight={<AccountButton />}
      width={columns > 1 ? "wide" : "readable"}
      refreshing={refreshing}
      onRefresh={onRefresh}
    >
      {scans.length === 0 ? (
        <>
          <EmptyState
            icon="scan-outline"
            title="No scans yet"
            text="Scan a product to start building your history."
            actionLabel="Start scanning"
            onAction={() => router.navigate("/")}
          />
          <View style={styles.privacy}>
            <Ionicons name="lock-closed-outline" size={14} color={colors.muted} />
            <Text style={styles.privacyText}>Scan history never leaves your device.</Text>
          </View>
        </>
      ) : columns > 1 ? (
        <View style={styles.split}>
          <View style={styles.splitCol}>
            {summary}
            {controls}
            {more}
          </View>
          <View style={styles.splitCol}>{list}</View>
        </View>
      ) : (
        <>
          {summary}
          {controls}
          {list}
          {more}
        </>
      )}
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
  controls: {
    gap: spacing.sm,
  },
  chips: {
    gap: spacing.sm,
    alignItems: "center",
  },
  chipGap: {
    width: 1,
    height: 20,
    backgroundColor: colors.border,
    marginHorizontal: spacing.xs,
  },
  chip: {
    minHeight: 36,
    justifyContent: "center",
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderStrong,
  },
  chipActive: {
    backgroundColor: colors.text,
    borderColor: colors.text,
  },
  chipText: {
    ...typography.caption,
    color: colors.subtext,
    fontWeight: "700",
  },
  chipTextActive: {
    color: colors.bg,
  },
  listCaption: {
    ...typography.caption,
    color: colors.muted,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  more: {
    gap: spacing.md,
  },
  moreToggle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    minHeight: 44,
  },
  moreLabel: {
    ...typography.bodyStrong,
    color: colors.subtext,
  },
  moreBody: {
    gap: spacing.lg,
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
  historySub: {
    ...typography.caption,
    color: colors.subtext,
    marginTop: 2,
  },
  historyRight: {
    alignItems: "flex-end",
    gap: 4,
  },
  tonePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
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
