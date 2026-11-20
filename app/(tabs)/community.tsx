import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import { Alert, FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";

import { Card } from "../../components/ui/Card";
import { EmptyState } from "../../components/ui/EmptyState";
import { Flag } from "../../components/ui/Flag";
import { Screen, ScreenHeader, useScreenInsets } from "../../components/ui/Screen";
import { SearchField } from "../../components/ui/SearchField";
import { SegmentedControl } from "../../components/ui/SegmentedControl";
import { VoteButtons } from "../../components/voting/VoteButtons";
import { colors, layout as sizes, radius, spacing, typography } from "../../constants/theme";
import { useAuth } from "../../contexts/AuthContext";
import { useCountryVotes } from "../../hooks/useCountryVotes";
import { useLayout } from "../../hooks/useLayout";
import { useScanHistory } from "../../hooks/useScanHistory";
import { hapticSelection } from "../../lib/haptics";
import { openCountry } from "../../lib/navigation";
import { getVotableCountryNames, type CountryTally, type VoteChoice } from "../../lib/votes";

const ALL_COUNTRIES = getVotableCountryNames();
type Tab = "all" | "mine";
type Sort = "votes" | "az" | "positive" | "negative";

const SORTS: { key: Sort; label: string; icon: React.ComponentProps<typeof Ionicons>["name"] }[] = [
  { key: "votes", label: "Most votes", icon: "flame-outline" },
  { key: "az", label: "A–Z", icon: "text-outline" },
  { key: "positive", label: "Most positive", icon: "thumbs-up-outline" },
  { key: "negative", label: "Most negative", icon: "thumbs-down-outline" },
];

const totalOf = (t?: CountryTally) => (t?.upvotes ?? 0) + (t?.downvotes ?? 0);
const shareOf = (t?: CountryTally) => (totalOf(t) ? (t!.upvotes ?? 0) / totalOf(t) : -1);

export default function CommunityScreen() {
  const { user } = useAuth();
  const { scans, gamification, applyGamificationState } = useScanHistory();
  const { tallies, getTally, getVerdict, myVote, castVote, loadingTallies, reload } = useCountryVotes(
    scans,
    gamification,
    applyGamificationState
  );
  const layout = useLayout();
  const pad = useScreenInsets();
  const [search, setSearch] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState<Tab>("all");
  const [sort, setSort] = useState<Sort>("votes");

  const columns = layout.columns;
  const sidePad = Math.max(pad.paddingRight, (layout.width - (layout.useRail ? 88 : 0) - sizes.wide) / 2);

  const onRefresh = async () => {
    setRefreshing(true);
    await reload(true);
    setRefreshing(false);
  };

  const myVoted = useMemo(() => ALL_COUNTRIES.filter((c) => myVote(c) !== undefined), [myVote]);

  const data = useMemo(() => {
    const base = tab === "mine" ? myVoted : ALL_COUNTRIES;
    const q = search.trim().toLowerCase();
    const filtered = q ? base.filter((c) => c.toLowerCase().includes(q)) : [...base];
    const byName = (a: string, b: string) => a.localeCompare(b);
    switch (sort) {
      case "votes":
        return filtered.sort((a, b) => totalOf(getTally(b)) - totalOf(getTally(a)) || byName(a, b));
      case "positive":
        return filtered.sort((a, b) => shareOf(getTally(b)) - shareOf(getTally(a)) || byName(a, b));
      case "negative":
        return filtered.sort(
          (a, b) =>
            (shareOf(getTally(a)) < 0 ? 2 : shareOf(getTally(a))) - (shareOf(getTally(b)) < 0 ? 2 : shareOf(getTally(b))) ||
            byName(a, b)
        );
      default:
        return filtered.sort(byName);
    }
  }, [search, tab, sort, myVoted, getTally]);

  const communityStats = useMemo(() => {
    let up = 0;
    let down = 0;
    let voted = 0;
    for (const t of Object.values(tallies)) {
      if (totalOf(t) > 0) voted += 1;
      up += t.upvotes ?? 0;
      down += t.downvotes ?? 0;
    }
    return { up, down, total: up + down, voted };
  }, [tallies]);

  const handleVote = useCallback(
    async (country: string, choice: VoteChoice) => {
      const outcome = await castVote(country, choice);
      if (outcome.ok) return;
      if (outcome.reason === "signed-out") router.push("/auth");
      else if (outcome.reason === "unverified")
        Alert.alert("Verify your email", "Confirm your email address from the Profile tab to vote.");
      else Alert.alert("Vote not saved", "Check your connection and try again.");
    },
    [castVote]
  );

  const renderItem = ({ item: country }: { item: string }) => {
    const verdict = getVerdict(country);
    const tally = getTally(country);
    const mine = myVote(country);
    const total = totalOf(tally);
    return (
      <View style={[styles.cell, { width: `${100 / columns}%`, paddingHorizontal: columns > 1 ? spacing.xs : 0 }]}>
        <Card tone={total > 0 && !verdict ? "negative" : "default"} style={styles.row}>
          <Pressable
            onPress={() => openCountry(country)}
            style={({ pressed }) => [styles.rowTop, pressed && { opacity: 0.7 }]}
            accessibilityRole="button"
            accessibilityLabel={`${country}, ${total ? (verdict ? "positive" : "negative") : "no votes yet"}`}
            accessibilityHint="Opens country details"
          >
            <Flag country={country} size={24} />
            <View style={styles.rowTitleWrap}>
              <Text style={styles.rowTitle} numberOfLines={1}>
                {country}
              </Text>
              <Text style={styles.rowMeta}>{total ? `${total.toLocaleString()} vote${total === 1 ? "" : "s"}` : "No votes yet"}</Text>
            </View>
            {mine ? (
              <View style={styles.mineTag}>
                <Ionicons name={mine === "up" ? "thumbs-up" : "thumbs-down"} size={11} color={colors.accent} />
                <Text style={styles.mineText}>You</Text>
              </View>
            ) : null}
            <Ionicons name="chevron-forward" size={16} color={colors.muted} />
          </Pressable>
          <VoteButtons tally={tally} myChoice={mine} onPress={(choice) => handleVote(country, choice)} compact showBar />
        </Card>
      </View>
    );
  };

  const header = (
    <View style={styles.headerWrap}>
      <ScreenHeader title="Community" subtitle="Every country's colour comes from open voting, not from us." />

      <Card tone="hero">
        <View style={styles.statsRow}>
          {[
            { label: "Votes", value: communityStats.total, color: colors.text },
            { label: "Up", value: communityStats.up, color: colors.positive },
            { label: "Down", value: communityStats.down, color: colors.negative },
            { label: "Countries", value: communityStats.voted, color: colors.gold },
          ].map((s) => (
            <View key={s.label} style={styles.stat}>
              <Text style={[styles.statValue, { color: s.color }]}>{s.value.toLocaleString()}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>
        {!user ? (
          <Pressable onPress={() => router.push("/auth")} style={styles.heroHint} accessibilityRole="button">
            <Ionicons name="lock-closed" size={12} color={colors.subtext} />
            <Text style={styles.heroHintText}>Anyone can see the counts. </Text>
            <Text style={[styles.heroHintText, styles.heroHintLink]}>Sign in to vote</Text>
          </Pressable>
        ) : null}
      </Card>

      <View style={styles.controls}>
        <SearchField placeholder={`Search ${ALL_COUNTRIES.length} countries`} value={search} onChangeText={setSearch} />
        {user ? (
          <SegmentedControl
            segments={[
              { key: "all", label: "All countries" },
              { key: "mine", label: `My votes${myVoted.length ? ` · ${myVoted.length}` : ""}` },
            ]}
            value={tab}
            onChange={(k) => setTab(k as Tab)}
          />
        ) : null}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {SORTS.map((s) => {
            const active = sort === s.key;
            return (
              <Pressable
                key={s.key}
                onPress={() => {
                  if (!active) {
                    hapticSelection();
                    setSort(s.key);
                  }
                }}
                style={[styles.chip, active && styles.chipActive]}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                accessibilityLabel={`Sort by ${s.label}`}
              >
                <Ionicons name={s.icon} size={14} color={active ? colors.bg : colors.subtext} />
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{s.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
    </View>
  );

  const empty = loadingTallies ? (
    <Text style={styles.loading}>Loading vote counts…</Text>
  ) : (
    <EmptyState
      icon={tab === "mine" ? "thumbs-up-outline" : "search-outline"}
      text={
        search
          ? `No countries match “${search}”.`
          : "You haven't voted yet. Open any country, or scan a product, to cast your first vote."
      }
    />
  );

  return (
    <Screen scroll={false}>
      <FlatList
        key={`cols-${columns}`}
        data={data}
        keyExtractor={(c) => c}
        numColumns={columns}
        renderItem={renderItem}
        ListHeaderComponent={header}
        ListEmptyComponent={empty}
        contentContainerStyle={{
          paddingTop: pad.paddingTop,
          paddingBottom: pad.paddingBottom,
          paddingLeft: layout.useRail ? sidePad : Math.max(pad.paddingLeft, sidePad),
          paddingRight: sidePad,
        }}
        columnWrapperStyle={columns > 1 ? styles.columnWrapper : undefined}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
        initialNumToRender={12}
        windowSize={7}
        removeClippedSubviews
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.text}
            colors={[colors.accentStrong]}
            progressBackgroundColor={colors.surfaceHigh}
            progressViewOffset={pad.paddingTop}
          />
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerWrap: {
    gap: spacing.lg,
    marginBottom: spacing.lg,
  },
  statsRow: {
    flexDirection: "row",
  },
  stat: {
    flex: 1,
    alignItems: "center",
  },
  statValue: {
    ...typography.stat,
  },
  statLabel: {
    ...typography.overline,
    color: colors.subtext,
    marginTop: 2,
  },
  heroHint: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    flexWrap: "wrap",
    gap: 4,
    marginTop: spacing.md,
  },
  heroHintText: {
    ...typography.caption,
    color: colors.subtext,
    fontWeight: "500",
  },
  heroHintLink: {
    color: colors.accent,
    fontWeight: "700",
  },
  controls: {
    gap: spacing.md,
  },
  chips: {
    gap: spacing.sm,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    minHeight: 36,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.panel,
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
  },
  chipTextActive: {
    color: colors.bg,
  },
  columnWrapper: {
    marginHorizontal: -spacing.xs,
  },
  cell: {
    paddingBottom: spacing.sm,
  },
  row: {
    padding: spacing.md,
    gap: spacing.md,
  },
  rowTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    minHeight: 40,
  },
  rowTitleWrap: {
    flex: 1,
  },
  rowTitle: {
    ...typography.bodyStrong,
    color: colors.text,
  },
  rowMeta: {
    ...typography.caption,
    color: colors.muted,
    fontWeight: "500",
    marginTop: 1,
  },
  mineTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(142, 166, 255, 0.14)",
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  mineText: {
    ...typography.caption,
    color: colors.accent,
    fontSize: 11,
  },
  loading: {
    ...typography.body,
    color: colors.subtext,
    textAlign: "center",
    paddingVertical: spacing.xl,
  },
});
