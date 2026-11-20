import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

import { Avatar } from "../../components/ui/Avatar";
import { Card } from "../../components/ui/Card";
import { EmptyState } from "../../components/ui/EmptyState";
import { Screen } from "../../components/ui/Screen";
import { colors, radius, spacing, typography } from "../../constants/theme";
import { useAuth } from "../../contexts/AuthContext";
import { useLayout } from "../../hooks/useLayout";
import { fetchLeaderboard, type LeaderboardEntry } from "../../lib/cloudSync";
import { getRankTitle } from "../../lib/gamification";

const MEDAL = [colors.gold, colors.tierSilver, colors.tierBronze];

function Podium({ entries, selfUid }: { entries: LeaderboardEntry[]; selfUid?: string }) {
  // Visual order: 2nd, 1st, 3rd.
  const order = [entries[1], entries[0], entries[2]].filter(Boolean) as LeaderboardEntry[];
  return (
    <View style={styles.podium}>
      {order.map((entry) => {
        const place = entries.indexOf(entry);
        const isFirst = place === 0;
        return (
          <Animated.View
            key={entry.uid}
            entering={FadeInDown.delay(80 * place).springify().damping(16)}
            style={[styles.podiumCol, isFirst && styles.podiumFirst]}
          >
            <View style={[styles.podiumAvatarRing, { borderColor: MEDAL[place] }]}>
              <Avatar name={entry.displayName} seed={entry.uid} size={isFirst ? 64 : 52} />
            </View>
            <Text style={[styles.podiumName, entry.uid === selfUid && { color: colors.accent }]} numberOfLines={1}>
              {entry.displayName || "Scanner"}
            </Text>
            <Text style={styles.podiumXp}>{entry.xp.toLocaleString()} XP</Text>
            <LinearGradient
              colors={[`${MEDAL[place]}55`, `${MEDAL[place]}08`]}
              style={[styles.podiumBase, { height: isFirst ? 84 : place === 1 ? 64 : 48 }]}
            >
              <Text style={[styles.podiumPlace, { color: MEDAL[place] }]}>{place + 1}</Text>
            </LinearGradient>
          </Animated.View>
        );
      })}
    </View>
  );
}

export default function LeaderboardScreen() {
  const { user, loading: authLoading, isFirebaseConfigured } = useAuth();
  const { columns } = useLayout();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Load on every focus. This is served from the 30-minute cache, and the
  // user's own row is patched locally after opting in or syncing. Wait for
  // auth to restore first so a real fetch carries the persisted session.
  useFocusEffect(
    useCallback(() => {
      if (authLoading) return;
      let cancelled = false;
      (async () => {
        const data = await fetchLeaderboard();
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
    setEntries(await fetchLeaderboard({ force: true }));
    setRefreshing(false);
  };

  const myIndex = user ? entries.findIndex((e) => e.uid === user.uid) : -1;
  const rest = entries.slice(3);

  return (
    <Screen
      title="Leaderboard"
      subtitle="Top scanners who chose to appear publicly."
      width={columns > 1 ? "wide" : "readable"}
      refreshing={refreshing}
      onRefresh={onRefresh}
    >
      {!isFirebaseConfigured ? (
        <EmptyState icon="cloud-offline-outline" title="Leaderboard unavailable" text="Accounts aren't set up in this build." />
      ) : loading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : entries.length === 0 ? (
        <EmptyState
          icon="trophy-outline"
          title="No one here yet"
          text="Verify your email and turn on “Show me on the leaderboard” in Profile to be first."
          actionLabel="Go to Profile"
          onAction={() => router.navigate("/profile")}
        />
      ) : (
        <>
          {myIndex >= 0 ? (
            <Card tone="hero" style={styles.youCard}>
              <Ionicons name="person-circle" size={22} color={colors.brandSoft} />
              <Text style={styles.youText}>
                You&apos;re <Text style={styles.youRank}>#{myIndex + 1}</Text> of {entries.length}
              </Text>
            </Card>
          ) : user ? null : (
            <Card style={styles.youCard}>
              <Ionicons name="information-circle-outline" size={20} color={colors.subtext} />
              <Text style={styles.youHint}>Sign in from Profile to join the leaderboard.</Text>
            </Card>
          )}

          <Podium entries={entries.slice(0, 3)} selfUid={user?.uid} />

          {rest.length > 0 && (
            <View style={[styles.list, columns > 1 && styles.listGrid]}>
              {rest.map((entry, i) => {
                const rank = i + 4;
                const self = entry.uid === user?.uid;
                return (
                  <View key={entry.uid} style={columns > 1 ? styles.gridCell : undefined}>
                    <Card style={[styles.row, self && styles.rowSelf]} padded={false}>
                      <Text style={styles.rank}>{rank}</Text>
                      <Avatar name={entry.displayName} seed={entry.uid} size={38} />
                      <View style={styles.rowMid}>
                        <Text style={styles.name} numberOfLines={1}>
                          {entry.displayName || "Scanner"}
                          {self ? <Text style={styles.youTag}>  You</Text> : null}
                        </Text>
                        <Text style={styles.tier}>
                          {getRankTitle(entry.level)} · Level {entry.level} · {entry.currentStreak}d streak
                        </Text>
                      </View>
                      <View style={styles.xpPill}>
                        <Ionicons name="flash" size={12} color={colors.gold} />
                        <Text style={styles.xp}>{entry.xp.toLocaleString()}</Text>
                      </View>
                    </Card>
                  </View>
                );
              })}
            </View>
          )}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  loading: {
    paddingVertical: spacing.xxxl,
  },
  youCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  youText: {
    ...typography.body,
    color: colors.text,
  },
  youRank: {
    fontWeight: "800",
    color: colors.brandSoft,
  },
  youHint: {
    ...typography.body,
    color: colors.subtext,
    flex: 1,
  },
  podium: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "center",
    gap: spacing.sm,
    paddingTop: spacing.md,
  },
  podiumCol: {
    flex: 1,
    maxWidth: 160,
    alignItems: "center",
    gap: 4,
  },
  podiumFirst: {
    marginBottom: 0,
  },
  podiumAvatarRing: {
    borderWidth: 2.5,
    borderRadius: 999,
    padding: 3,
    marginBottom: spacing.xs,
  },
  podiumName: {
    ...typography.bodyStrong,
    color: colors.text,
    maxWidth: "100%",
  },
  podiumXp: {
    ...typography.caption,
    color: colors.subtext,
    fontVariant: ["tabular-nums"],
  },
  podiumBase: {
    width: "100%",
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    alignItems: "center",
    justifyContent: "center",
    marginTop: spacing.sm,
  },
  podiumPlace: {
    ...typography.display,
  },
  list: {
    gap: spacing.sm,
  },
  listGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -spacing.xs,
    // Cells are 50% wide with their own padding; a column gap would wrap them.
    columnGap: 0,
    rowGap: spacing.sm,
  },
  gridCell: {
    width: "50%",
    paddingHorizontal: spacing.xs,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
  },
  rowSelf: {
    borderColor: "rgba(142, 166, 255, 0.55)",
  },
  rank: {
    ...typography.bodyStrong,
    color: colors.muted,
    width: 28,
    textAlign: "center",
    fontVariant: ["tabular-nums"],
  },
  rowMid: {
    flex: 1,
  },
  name: {
    ...typography.bodyStrong,
    color: colors.text,
  },
  youTag: {
    ...typography.caption,
    color: colors.accent,
  },
  tier: {
    ...typography.caption,
    color: colors.subtext,
    fontWeight: "500",
    marginTop: 2,
  },
  xpPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(251, 191, 36, 0.10)",
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
  },
  xp: {
    ...typography.caption,
    color: colors.text,
    fontWeight: "800",
    fontVariant: ["tabular-nums"],
  },
});
