import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import { Alert, FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";

import { LeaderboardList } from "../../components/leaderboard/LeaderboardList";
import { AccountButton } from "../../components/navigation/AccountButton";
import { Card } from "../../components/ui/Card";
import { EmptyState } from "../../components/ui/EmptyState";
import { Flag } from "../../components/ui/Flag";
import { Screen, ScreenHeader, useScreenInsets } from "../../components/ui/Screen";
import { SearchField } from "../../components/ui/SearchField";
import { SegmentedControl } from "../../components/ui/SegmentedControl";
import { VoteButtons } from "../../components/voting/VoteButtons";
import { colors, layout as sizes, radius, spacing, typography } from "../../constants/theme";
import { useAuth } from "../../contexts/AuthContext";
import { useCountryRules } from "../../hooks/useCountryRules";
import { useCountryVotes } from "../../hooks/useCountryVotes";
import { useLayout } from "../../hooks/useLayout";
import { useLeaderboard } from "../../hooks/useLeaderboard";
import { useScanHistory } from "../../hooks/useScanHistory";
import { hapticSelection } from "../../lib/haptics";
import { openCountry } from "../../lib/navigation";
import { getVotableCountryNames, normalizeCountryKey, type CountryTally, type VoteChoice } from "../../lib/votes";

const ALL_COUNTRIES = getVotableCountryNames();
type Tab = "all" | "mine" | "rules";
type Section = "countries" | "leaderboard";
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
  // Tab screens stay mounted, so this choice survives switching tabs.
  const [section, setSection] = useState<Section>("countries");
  const leaderboard = useLeaderboard(section === "leaderboard");

  const columns = layout.columns;
  const sidePad = Math.max(pad.paddingRight, (layout.width - (layout.useRail ? 88 : 0) - sizes.wide) / 2);

  const onRefresh = async () => {
    setRefreshing(true);
    if (section === "leaderboard") await leaderboard.refresh();
    else await reload(true);
    setRefreshing(false);
  };

  const myVoted = useMemo(() => ALL_COUNTRIES.filter((c) => myVote(c) !== undefined), [myVote]);
  const rules = useCountryRules();
  const ruled = useMemo(() => ALL_COUNTRIES.filter((c) => rules[normalizeCountryKey(c)]), [rules]);

  const data = useMemo(() => {
    const base = tab === "mine" ? myVoted : tab === "rules" ? ruled : ALL_COUNTRIES;
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
  }, [search, tab, sort, myVoted, ruled, getTally]);

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
        Alert.alert("Verify your email", "Confirm your email address from Profile (the avatar at the top) to vote.");
      else Alert.alert("Vote not saved", "Check your connection and try again.");
    },
    [castVote]
  );

  const renderItem = ({ item: country }: { item: string }) => {
    const verdict = getVerdict(country);
    const tally = getTally(country);
    const mine = myVote(country);
    const rule = rules[normalizeCountryKey(country)];
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
            {rule ? (
              <View style={[styles.mineTag, { backgroundColor: rule === "avoid" ? "rgba(251,113,133,0.14)" : "rgba(74,222,155,0.14)" }]}>
                <Ionicons name="person" size={11} color={rule === "avoid" ? colors.negative : colors.positive} />
                <Text style={[styles.mineText, { color: rule === "avoid" ? colors.negative : colors.positive }]}>
                  {rule === "avoid" ? "Avoid" : "Support"}
                </Text>
              </View>
            ) : null}
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

  const summary = communityStats.total
    ? `${communityStats.total.toLocaleString()} votes across ${communityStats.voted} ${communityStats.voted === 1 ? "country" : "countries"}`
    : "No votes yet. Be the first.";

  const chips = (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
      {ruled.length > 0 || tab === "rules" ? (
        <Pressable
          onPress={() => {
            hapticSelection();
            setTab(tab === "rules" ? "all" : "rules");
          }}
          style={[styles.chip, tab === "rules" && styles.chipActive]}
          accessibilityRole="button"
          accessibilityState={{ selected: tab === "rules" }}
          accessibilityLabel="Show only countries with my rules"
        >
          <Ionicons name="shield-checkmark-outline" size={14} color={tab === "rules" ? colors.bg : colors.subtext} />
          <Text style={[styles.chipText, tab === "rules" && styles.chipTextActive]}>{`My rules · ${ruled.length}`}</Text>
        </Pressable>
      ) : null}
      {user ? (
        <Pressable
          onPress={() => {
            hapticSelection();
            setTab(tab === "mine" ? "all" : "mine");
          }}
          style={[styles.chip, tab === "mine" && styles.chipActive]}
          accessibilityRole="button"
          accessibilityState={{ selected: tab === "mine" }}
          accessibilityLabel="Show only countries I voted on"
        >
          <Ionicons name="person-outline" size={14} color={tab === "mine" ? colors.bg : colors.subtext} />
          <Text style={[styles.chipText, tab === "mine" && styles.chipTextActive]}>
            {`My votes${myVoted.length ? ` · ${myVoted.length}` : ""}`}
          </Text>
        </Pressable>
      ) : null}
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
  );

  const header = (
    <View style={styles.headerWrap}>
      <ScreenHeader
        title="Community"
        subtitle={section === "countries" ? summary : "Top scanners who chose to appear publicly."}
        right={<AccountButton />}
      />
      <SegmentedControl
        segments={[
          { key: "countries", label: "Countries" },
          { key: "leaderboard", label: "Leaderboard" },
        ]}
        value={section}
        onChange={(k) => setSection(k as Section)}
      />
      {section === "leaderboard" ? (
        <LeaderboardList entries={leaderboard.entries} loading={leaderboard.loading} />
      ) : (
        <View style={styles.controls}>
          <SearchField placeholder={`Search ${ALL_COUNTRIES.length} countries`} value={search} onChangeText={setSearch} />
          {chips}
          {!user ? (
            <Pressable onPress={() => router.push("/auth")} style={styles.heroHint} accessibilityRole="button">
              <Ionicons name="lock-closed" size={12} color={colors.subtext} />
              <Text style={styles.heroHintText}>Anyone can see the counts. </Text>
              <Text style={[styles.heroHintText, styles.heroHintLink]}>Sign in to vote</Text>
            </Pressable>
          ) : null}
        </View>
      )}
    </View>
  );

  const empty = loadingTallies ? (
    <Text style={styles.loading}>Loading vote counts…</Text>
  ) : (
    <EmptyState
      icon={tab === "mine" ? "thumbs-up-outline" : tab === "rules" ? "shield-checkmark-outline" : "search-outline"}
      text={
        search
          ? `No countries match “${search}”.`
          : tab === "rules"
            ? "No personal rules yet. Open a country to mark it Avoid or Support."
            : "You haven't voted yet. Open any country, or scan a product, to cast your first vote."
      }
    />
  );

  return (
    <Screen scroll={false}>
      <FlatList
        key={`cols-${columns}`}
        data={section === "countries" ? data : []}
        keyExtractor={(c) => c}
        numColumns={columns}
        renderItem={renderItem}
        ListHeaderComponent={header}
        ListEmptyComponent={section === "countries" ? empty : undefined}
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
  heroHint: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    flexWrap: "wrap",
    gap: 4,
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
