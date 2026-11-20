import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import { Alert, FlatList, RefreshControl, StyleSheet, Text, View } from "react-native";

import { Card } from "../../components/ui/Card";
import { EmptyState } from "../../components/ui/EmptyState";
import { IconButton } from "../../components/ui/IconButton";
import { Screen, ScreenHeader, useScreenInsets } from "../../components/ui/Screen";
import { SearchField } from "../../components/ui/SearchField";
import { SegmentedControl } from "../../components/ui/SegmentedControl";
import { VoteButtons } from "../../components/voting/VoteButtons";
import { colors, layout as sizes, radius, spacing, typography } from "../../constants/theme";
import { useAuth } from "../../contexts/AuthContext";
import { useCountryVotes } from "../../hooks/useCountryVotes";
import { useLayout } from "../../hooks/useLayout";
import { useScanHistory } from "../../hooks/useScanHistory";
import { getVotableCountryNames, type VoteChoice } from "../../lib/votes";

const ALL_COUNTRIES = getVotableCountryNames();
type Tab = "trending" | "all" | "mine";

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
  const [searchOpen, setSearchOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState<Tab>("all");

  const columns = layout.columns;
  const maxWidth = sizes.wide;
  const sidePad = Math.max(pad.paddingRight, (layout.width - (layout.useRail ? 88 : 0) - maxWidth) / 2);

  const onRefresh = async () => {
    setRefreshing(true);
    await reload(true);
    setRefreshing(false);
  };

  const myVotedCountries = useMemo(() => ALL_COUNTRIES.filter((c) => myVote(c) !== undefined), [myVote]);

  const trending = useMemo(
    () =>
      ALL_COUNTRIES.map((country) => {
        const t = getTally(country);
        return { country, total: (t?.upvotes ?? 0) + (t?.downvotes ?? 0) };
      })
        .filter((e) => e.total > 0)
        .sort((a, b) => b.total - a.total)
        .slice(0, 20)
        .map((e) => e.country),
    [getTally]
  );

  const data = useMemo(() => {
    const base = tab === "mine" ? myVotedCountries : tab === "trending" ? trending : ALL_COUNTRIES;
    const q = search.trim().toLowerCase();
    return q ? base.filter((c) => c.toLowerCase().includes(q)) : base;
  }, [search, tab, myVotedCountries, trending]);

  const communityStats = useMemo(() => {
    let up = 0;
    let down = 0;
    let voted = 0;
    for (const t of Object.values(tallies)) {
      if ((t.upvotes ?? 0) + (t.downvotes ?? 0) > 0) voted += 1;
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
    return (
      <View style={[styles.cell, { width: `${100 / columns}%`, paddingHorizontal: columns > 1 ? spacing.xs : 0 }]}>
        <Card tone={verdict ? "default" : "negative"} style={styles.row}>
          <View style={styles.rowTop}>
            <View style={[styles.dot, { backgroundColor: verdict ? colors.positive : colors.negative }]} />
            <Text style={styles.rowTitle} numberOfLines={1}>
              {country}
            </Text>
            {mine ? (
              <View style={styles.mineTag}>
                <Text style={styles.mineText}>Voted</Text>
              </View>
            ) : null}
          </View>
          <VoteButtons tally={tally} myChoice={mine} onPress={(choice) => handleVote(country, choice)} compact showBar />
        </Card>
      </View>
    );
  };

  const header = (
    <View style={styles.headerWrap}>
      <ScreenHeader
        title="Community"
        subtitle="Every country's colour is set by open voting, not by us."
        right={
          <IconButton
            icon={searchOpen ? "close" : "search"}
            onPress={() => {
              if (searchOpen) setSearch("");
              setSearchOpen((v) => !v);
            }}
            active={searchOpen}
            accessibilityLabel={searchOpen ? "Close search" : "Search countries"}
          />
        }
      />

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
          <Text style={styles.heroHint}>
            <Ionicons name="lock-closed" size={12} color={colors.subtext} /> Anyone can see the counts. Sign in and verify
            your email to vote.
          </Text>
        ) : null}
      </Card>

      {searchOpen ? (
        <SearchField placeholder="Search countries…" value={search} onChangeText={setSearch} autoFocus />
      ) : (
        <SegmentedControl
          segments={[
            { key: "trending", label: "Trending" },
            { key: "all", label: "All" },
            ...(user ? [{ key: "mine", label: `My votes${myVotedCountries.length ? ` · ${myVotedCountries.length}` : ""}` }] : []),
          ]}
          value={tab}
          onChange={(key) => setTab(key as Tab)}
        />
      )}
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
          : tab === "mine"
            ? "You haven't voted yet. Scan a product or pick a country to cast your first vote."
            : "No trending countries yet. Be the first to vote."
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
    ...typography.caption,
    color: colors.subtext,
    fontWeight: "500",
    marginTop: spacing.md,
    textAlign: "center",
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
    gap: spacing.sm,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: radius.pill,
  },
  rowTitle: {
    ...typography.bodyStrong,
    color: colors.text,
    flex: 1,
  },
  mineTag: {
    backgroundColor: "rgba(142, 166, 255, 0.14)",
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
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
