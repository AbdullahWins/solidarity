import { Ionicons } from "@expo/vector-icons";
import { router, Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useMemo, useState } from "react";
import { Alert, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Animated, { FadeIn, FadeOut, LinearTransition } from "react-native-reanimated";

import { Card } from "../../components/ui/Card";
import { ScreenContainer } from "../../components/ui/ScreenContainer";
import { SearchField } from "../../components/ui/SearchField";
import { SectionHeader } from "../../components/ui/SectionHeader";
import { SegmentedControl } from "../../components/ui/SegmentedControl";
import { VoteButtons } from "../../components/voting/VoteButtons";
import { colors, radius, spacing, typography } from "../../constants/theme";
import { useAuth } from "../../contexts/AuthContext";
import { useCountryVotes } from "../../hooks/useCountryVotes";
import { useScanHistory } from "../../hooks/useScanHistory";
import { getVotableCountryNames, type CountryTally, type VoteChoice } from "../../lib/votes";

const ALL_COUNTRIES = getVotableCountryNames();

export default function CommunityScreen() {
  const { user } = useAuth();
  const { scans, gamification, applyGamificationState } = useScanHistory();
  const { tallies, getTally, getVerdict, myVote, castVote, loadingTallies, reload } =
    useCountryVotes(scans, gamification, applyGamificationState);
  const [search, setSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState<"trending" | "all" | "mine">("all");
  const showMyVotes = tab === "mine";

  const closeSearch = () => {
    setSearchOpen(false);
    setSearch("");
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await reload(true); // force: bypass the tally cache for an explicit pull-to-refresh
    setRefreshing(false);
  };

  const myVotedCountries = useMemo(
    () => ALL_COUNTRIES.filter((country) => myVote(country) !== undefined),
    [myVote]
  );

  const trending = useMemo(() => {
    return ALL_COUNTRIES.map((country) => {
      const tally = getTally(country);
      const total = (tally?.upvotes ?? 0) + (tally?.downvotes ?? 0);
      return { country, total };
    })
      .filter((entry) => entry.total > 0)
      .sort((a, b) => b.total - a.total)
      .slice(0, 20)
      .map((entry) => entry.country);
  }, [getTally]);

  const filteredCountries = useMemo(() => {
    const base = tab === "mine" ? myVotedCountries : tab === "trending" ? trending : ALL_COUNTRIES;
    const query = search.trim().toLowerCase();
    if (!query) return base;
    return base.filter((country) => country.toLowerCase().includes(query));
  }, [search, tab, myVotedCountries, trending]);

  const communityStats = useMemo(() => {
    let upvotes = 0;
    let downvotes = 0;
    let votedCountries = 0;
    for (const tally of Object.values(tallies)) {
      const total = (tally.upvotes ?? 0) + (tally.downvotes ?? 0);
      if (total > 0) votedCountries += 1;
      upvotes += tally.upvotes ?? 0;
      downvotes += tally.downvotes ?? 0;
    }
    return { upvotes, downvotes, total: upvotes + downvotes, votedCountries };
  }, [tallies]);

  const handleVote = async (country: string, choice: VoteChoice) => {
    const outcome = await castVote(country, choice);
    if (!outcome.ok) {
      if (outcome.reason === "signed-out") {
        router.push("/auth");
      } else if (outcome.reason === "unverified") {
        Alert.alert(
          "Verify your email",
          "Verify your email address in Profile to vote on countries."
        );
      }
    }
  };

  const renderRow = (country: string) => {
    const verdict = getVerdict(country);
    const tally: CountryTally | undefined = getTally(country);

    if (showMyVotes) {
      return (
        <Card key={country} tone={verdict ? "positive" : "negative"} style={styles.myVoteRow}>
          <View style={styles.rowTop}>
            <View style={[styles.dot, { backgroundColor: verdict ? colors.positive : colors.negative }]} />
            <Text style={styles.rowTitle}>{country}</Text>
          </View>
          <VoteButtons
            tally={tally}
            myChoice={myVote(country)}
            onPress={(choice) => handleVote(country, choice)}
            compact
          />
        </Card>
      );
    }

    return (
      <Card key={country} tone={verdict ? "positive" : "negative"} style={styles.row}>
        <View style={styles.rowTop}>
          <View style={[styles.dot, { backgroundColor: verdict ? colors.positive : colors.negative }]} />
          <Text style={styles.rowTitle}>{country}</Text>
        </View>
        <View style={styles.countRow}>
          <View style={styles.countPill}>
            <Ionicons name="arrow-up-circle" size={16} color={colors.positive} />
            <Text style={styles.countText}>{tally?.upvotes ?? 0}</Text>
          </View>
          <View style={styles.countPill}>
            <Ionicons name="arrow-down-circle" size={16} color={colors.negative} />
            <Text style={styles.countText}>{tally?.downvotes ?? 0}</Text>
          </View>
        </View>
      </Card>
    );
  };

  return (
    <>
      <Stack.Screen options={{ title: "Community" }} />
      <ScreenContainer>
        <StatusBar style="light" />
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.text} />
          }
        >
          <Card style={styles.hero}>
            <View style={styles.heroHeader}>
              <View style={styles.heroBadge}>
                <Ionicons name="people" size={16} color={colors.accent} />
              </View>
              <Text style={styles.heroTitle}>Community-driven, not developer-asserted</Text>
            </View>
            <Text style={styles.heroText}>
              Every country&apos;s color is decided by open voting from Solidarity users — not by
              us. Scan a product to vote, or manage your votes below.
            </Text>

            <View style={styles.heroStatsRow}>
              <View style={styles.heroStat}>
                <Text style={styles.heroStatValue}>{communityStats.total}</Text>
                <Text style={styles.heroStatLabel}>Votes</Text>
              </View>
              <View style={styles.heroStat}>
                <Text style={[styles.heroStatValue, { color: colors.positive }]}>
                  {communityStats.upvotes}
                </Text>
                <Text style={styles.heroStatLabel}>Up</Text>
              </View>
              <View style={styles.heroStat}>
                <Text style={[styles.heroStatValue, { color: colors.negative }]}>
                  {communityStats.downvotes}
                </Text>
                <Text style={styles.heroStatLabel}>Down</Text>
              </View>
              <View style={styles.heroStat}>
                <Text style={[styles.heroStatValue, { color: colors.gold }]}>
                  {communityStats.votedCountries}
                </Text>
                <Text style={styles.heroStatLabel}>Countries</Text>
              </View>
            </View>
          </Card>

          <View style={styles.toolbarRow}>
            {searchOpen ? (
              <Animated.View
                entering={FadeIn.duration(150)}
                exiting={FadeOut.duration(100)}
                layout={LinearTransition.duration(200)}
                style={styles.toolbarGrow}
              >
                <SearchField
                  placeholder="Search countries…"
                  value={search}
                  onChangeText={setSearch}
                  autoFocus
                />
              </Animated.View>
            ) : (
              <Animated.View
                entering={FadeIn.duration(150)}
                exiting={FadeOut.duration(100)}
                layout={LinearTransition.duration(200)}
                style={styles.toolbarGrow}
              >
                <SegmentedControl
                  segments={[
                    { key: "trending", label: "Trending" },
                    { key: "all", label: "All Countries" },
                    ...(user ? [{ key: "mine", label: "My Votes" }] : []),
                  ]}
                  value={tab}
                  onChange={(key) => setTab(key as "trending" | "all" | "mine")}
                />
              </Animated.View>
            )}

            <TouchableOpacity
              style={styles.searchToggle}
              onPress={() => (searchOpen ? closeSearch() : setSearchOpen(true))}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons
                name={searchOpen ? "close" : "search"}
                size={19}
                color={searchOpen ? colors.accent : colors.text}
              />
            </TouchableOpacity>
          </View>

          <View>
            <SectionHeader
              title={
                search
                  ? "Results"
                  : tab === "mine"
                    ? `My Votes${myVotedCountries.length > 0 ? ` (${myVotedCountries.length})` : ""}`
                    : tab === "trending"
                      ? "Trending"
                      : "All Countries"
              }
            />
            {loadingTallies ? (
              <Text style={styles.introText}>Loading vote counts…</Text>
            ) : filteredCountries.length === 0 ? (
              <Text style={styles.introText}>
                {tab === "mine"
                  ? "You haven't voted on any countries yet — scan a product to cast your first vote."
                  : tab === "trending"
                    ? "No trending countries yet — be the first to vote."
                    : `No countries match "${search}".`}
              </Text>
            ) : (
              <View style={{ gap: spacing.sm }}>{filteredCountries.map(renderRow)}</View>
            )}
          </View>
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
    gap: spacing.lg,
  },
  hero: {
    borderColor: `${colors.accent}33`,
  },
  heroHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  heroBadge: {
    width: 26,
    height: 26,
    borderRadius: radius.pill,
    backgroundColor: `${colors.accent}1f`,
    alignItems: "center",
    justifyContent: "center",
  },
  heroTitle: {
    ...typography.heading,
    color: colors.text,
    flexShrink: 1,
  },
  heroText: {
    ...typography.body,
    color: colors.subtext,
    lineHeight: 19,
  },
  heroStatsRow: {
    flexDirection: "row",
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  heroStat: {
    flex: 1,
    alignItems: "center",
  },
  heroStatValue: {
    ...typography.body,
    fontWeight: "800",
    color: colors.text,
  },
  heroStatLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.subtext,
    textTransform: "uppercase",
    letterSpacing: 0.3,
    marginTop: 1,
  },
  introText: {
    ...typography.body,
    color: colors.subtext,
    lineHeight: 19,
  },
  toolbarRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  toolbarGrow: {
    flex: 1,
  },
  searchToggle: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: colors.panelSoft,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  row: {
    padding: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  myVoteRow: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  rowTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    flexShrink: 1,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: radius.pill,
  },
  rowTitle: {
    ...typography.body,
    color: colors.text,
    fontWeight: "700",
  },
  countRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  countPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.panelSoft,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  countText: {
    ...typography.caption,
    color: colors.text,
    fontWeight: "700",
  },
});
