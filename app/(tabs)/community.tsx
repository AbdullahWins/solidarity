import { Ionicons } from "@expo/vector-icons";
import { router, Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useMemo } from "react";
import { Alert, ScrollView, StyleSheet, Text, View } from "react-native";

import { VoteButtons } from "../../components/voting/VoteButtons";
import { Card } from "../../components/ui/Card";
import { ScreenContainer } from "../../components/ui/ScreenContainer";
import { SectionHeader } from "../../components/ui/SectionHeader";
import { colors, radius, spacing, typography } from "../../constants/theme";
import { useCountryVotes } from "../../hooks/useCountryVotes";
import { useScanHistory } from "../../hooks/useScanHistory";
import { getVotableCountryNames, type VoteChoice } from "../../lib/votes";

const ALL_COUNTRIES = getVotableCountryNames();

export default function CommunityScreen() {
  const { scans, gamification, applyGamificationState } = useScanHistory();
  const { getTally, getVerdict, myVote, castVote, loadingTallies } = useCountryVotes(
    scans,
    gamification,
    applyGamificationState
  );

  const trending = useMemo(() => {
    return ALL_COUNTRIES.map((country) => {
      const tally = getTally(country);
      const total = (tally?.upvotes ?? 0) + (tally?.downvotes ?? 0);
      return { country, total };
    })
      .filter((entry) => entry.total > 0)
      .sort((a, b) => b.total - a.total)
      .slice(0, 8)
      .map((entry) => entry.country);
  }, [getTally]);

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
    return (
      <Card key={country} tone={verdict ? "positive" : "negative"} style={styles.row}>
        <View style={styles.rowTop}>
          <View style={[styles.dot, { backgroundColor: verdict ? colors.positive : colors.negative }]} />
          <Text style={styles.rowTitle}>{country}</Text>
        </View>
        <VoteButtons
          tally={getTally(country)}
          myChoice={myVote(country)}
          onPress={(choice) => handleVote(country, choice)}
          compact
        />
      </Card>
    );
  };

  return (
    <>
      <Stack.Screen options={{ title: "Community" }} />
      <ScreenContainer>
        <StatusBar style="light" />
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Card>
            <View style={styles.introRow}>
              <Ionicons name="people-circle" size={20} color={colors.accent} />
              <Text style={styles.introTitle}>Community-driven, not developer-asserted</Text>
            </View>
            <Text style={styles.introText}>
              Every country&apos;s color is decided by open voting from Solidarity users — not by us.
              Vote on any country below, even without scanning a product from it.
            </Text>
          </Card>

          {trending.length > 0 && (
            <View>
              <SectionHeader title="Trending" />
              <View style={{ gap: spacing.sm }}>{trending.map(renderRow)}</View>
            </View>
          )}

          <View>
            <SectionHeader title="All Countries" />
            {loadingTallies ? (
              <Text style={styles.introText}>Loading vote counts…</Text>
            ) : (
              <View style={{ gap: spacing.sm }}>{ALL_COUNTRIES.map(renderRow)}</View>
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
  introRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  introTitle: {
    ...typography.heading,
    color: colors.text,
    flexShrink: 1,
  },
  introText: {
    ...typography.body,
    color: colors.subtext,
    lineHeight: 19,
  },
  row: {
    padding: spacing.md,
    gap: spacing.sm,
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
    ...typography.body,
    color: colors.text,
    fontWeight: "700",
  },
});
