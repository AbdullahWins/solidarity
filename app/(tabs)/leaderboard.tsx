import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useCallback, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";

import { Card } from "../../components/ui/Card";
import { EmptyState } from "../../components/ui/EmptyState";
import { ScreenContainer } from "../../components/ui/ScreenContainer";
import { useAuth } from "../../contexts/AuthContext";
import { colors, radius, spacing, typography } from "../../constants/theme";
import { fetchLeaderboard, type CloudUserSummary } from "../../lib/cloudSync";
import { getRankTitle } from "../../lib/gamification";

export default function LeaderboardScreen() {
  const { user, loading: authLoading } = useAuth();
  const [entries, setEntries] = useState<CloudUserSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const data = await fetchLeaderboard(100);
    setEntries(data);
  }, []);

  // Refetch on every focus (not just mount) — e.g. after opting in from
  // Profile, or after the required Firestore index finishes building.
  // Also wait for auth to finish restoring first: querying before the
  // persisted session rehydrates sends the request unauthenticated, which
  // the security rules correctly reject as "missing or insufficient
  // permissions" — that's not a real failure, just a timing race.
  useFocusEffect(
    useCallback(() => {
      if (authLoading) return;
      let cancelled = false;
      (async () => {
        setLoading(true);
        const data = await fetchLeaderboard(100);
        if (cancelled) return;
        setEntries(data);
        setLoading(false);
      })();
      return () => {
        cancelled = true;
      };
    }, [authLoading])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  return (
    <>
      <Stack.Screen options={{ title: "Leaderboard" }} />
      <ScreenContainer>
        <StatusBar style="light" />
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.text} />}
        >
          {!loading && entries.length === 0 && (
            <EmptyState text="No leaderboard entries yet. Verify your email and opt in from Profile to be the first!" />
          )}
          {entries.map((entry, index) => (
            <Card
              key={entry.uid}
              style={
                entry.uid === user?.uid ? [styles.row, styles.rowSelf] : styles.row
              }
            >
              <Text style={styles.rank}>#{index + 1}</Text>
              <View style={styles.rowMid}>
                <Text style={styles.name}>{entry.displayName || "Scanner"}</Text>
                <Text style={styles.tier}>{getRankTitle(entry.level)} · Level {entry.level}</Text>
              </View>
              <View style={styles.rowRight}>
                <Ionicons name="flash" size={14} color={colors.gold} />
                <Text style={styles.xp}>{entry.xp} XP</Text>
              </View>
            </Card>
          ))}
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
    gap: spacing.sm,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.sm + 2,
    gap: spacing.sm,
  },
  rowSelf: {
    borderColor: `${colors.accent}88`,
  },
  rank: {
    ...typography.heading,
    color: colors.subtext,
    width: 36,
  },
  rowMid: {
    flex: 1,
  },
  name: {
    ...typography.body,
    color: colors.text,
    fontWeight: "700",
  },
  tier: {
    ...typography.caption,
    color: colors.subtext,
    marginTop: 2,
  },
  rowRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.panelSoft,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  xp: {
    ...typography.caption,
    color: colors.text,
    fontWeight: "700",
  },
});
