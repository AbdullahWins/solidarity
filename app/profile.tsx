import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";

import { DeleteAccountSheet } from "../components/account/DeleteAccountSheet";
import { RankTitle } from "../components/gamification/RankTitle";
import { ShareStatsButton } from "../components/share/ShareStatsButton";
import { Avatar } from "../components/ui/Avatar";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { ListRow } from "../components/ui/ListRow";
import { ProgressBar } from "../components/ui/ProgressBar";
import { ProgressRing } from "../components/ui/ProgressRing";
import { Screen } from "../components/ui/Screen";
import { SectionHeader } from "../components/ui/SectionHeader";
import { colors, radius, spacing, typography } from "../constants/theme";
import { useAuth } from "../contexts/AuthContext";
import { useCloudSync } from "../hooks/useCloudSync";
import { useLayout } from "../hooks/useLayout";
import { useScanHistory } from "../hooks/useScanHistory";
import { badgeDefinitions } from "../lib/badges";
import { levelProgress } from "../lib/gamification";

export default function ProfileScreen() {
  const { scans, gamification, stats, reload } = useScanHistory();
  const {
    user,
    emailVerified,
    isFirebaseConfigured,
    signOut,
    deleteAccount,
    resendVerificationEmail,
    refreshVerificationStatus,
  } = useAuth();
  const { mergeNotice, leaderboardOptIn, setOptIn, displayGamification, refreshCloud } = useCloudSync(
    scans,
    gamification
  );
  const { width, columns } = useLayout();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [checking, setChecking] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([reload(), refreshCloud()]);
    setRefreshing(false);
  };

  const xp = displayGamification?.xp ?? gamification.xp;
  const streak = displayGamification?.currentStreak ?? gamification.currentStreak;
  const best = displayGamification?.longestStreak ?? gamification.longestStreak;
  const { level, progress, nextThreshold } = levelProgress(xp);
  const unlockedCount = gamification.unlockedBadgeIds.length;

  const handleResend = async () => {
    setSending(true);
    const err = await resendVerificationEmail();
    setSending(false);
    Alert.alert(
      err ? "Couldn't send email" : "Verification email sent",
      err ? err.message : "Open the link in your inbox, then tap “I've verified”."
    );
  };

  const handleCheck = async () => {
    setChecking(true);
    const ok = await refreshVerificationStatus();
    setChecking(false);
    if (!ok) Alert.alert("Not verified yet", "We couldn't confirm your email yet. Open the link in the email and try again.");
  };

  const confirmSignOut = () =>
    Alert.alert("Sign out?", "Your progress stays on this device and in your cloud backup.", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign out", style: "destructive", onPress: () => void signOut() },
    ]);

  // In the two-column layout the badge column is roughly half the window.
  const perRow = columns > 1 ? (width >= 1100 ? 4 : 3) : width >= 600 ? 4 : 3;
  const badgeStyle = { width: `${100 / perRow - 2}%` as const, marginHorizontal: "1%" as const };

  const levelCard = (
    <Card tone="hero">
      <View style={styles.levelHeader}>
        <ProgressRing size={76} stroke={4} progress={progress}>
          {user ? (
            <Avatar name={user.displayName || user.email || "S"} seed={user.uid} size={60} />
          ) : (
            <View style={styles.guestAvatar}>
              <Ionicons name="person" size={26} color={colors.subtext} />
            </View>
          )}
          <View style={styles.levelBadge}>
            <Text style={styles.levelBadgeText}>{level}</Text>
          </View>
        </ProgressRing>
        <View style={styles.levelHeaderText}>
          <Text style={styles.name} numberOfLines={1}>
            {user ? user.displayName || "Scanner" : "Guest"}
          </Text>
          {user?.email ? (
            <Text style={styles.email} numberOfLines={1}>
              {user.email}
            </Text>
          ) : null}
          <RankTitle level={level} />
        </View>
      </View>

      <View style={styles.levelRow}>
        <Text style={styles.levelValue}>Level {level}</Text>
        <Text style={styles.xpText}>{xp.toLocaleString()} XP</Text>
      </View>
      <ProgressBar progress={progress} accessibilityLabel={`Progress to level ${level + 1}`} />
      <Text style={styles.nextText}>{Math.max(nextThreshold - xp, 0).toLocaleString()} XP to level {level + 1}</Text>

      <View style={styles.miniStats}>
        {[
          { icon: "flame" as const, value: `${streak}d`, label: "Streak", color: colors.gold },
          { icon: "podium" as const, value: `${best}d`, label: "Best", color: colors.gold },
          { icon: "ribbon" as const, value: `${unlockedCount}/${badgeDefinitions.length}`, label: "Badges", color: colors.accent },
          { icon: "thumbs-up" as const, value: `${gamification.voteCount}`, label: "Votes", color: colors.positive },
        ].map((s) => (
          <View key={s.label} style={styles.miniStat}>
            <Ionicons name={s.icon} size={16} color={s.color} />
            <Text style={styles.miniValue}>{s.value}</Text>
            <Text style={styles.miniLabel}>{s.label}</Text>
          </View>
        ))}
      </View>
      {mergeNotice ? <Text style={styles.mergeNotice}>{mergeNotice}</Text> : null}
    </Card>
  );

  const accountCard = isFirebaseConfigured ? (
    user ? (
      <Card padded={false}>
        <View style={styles.cardHead}>
          <SectionHeader title="Account" caption={emailVerified ? "Signed in · email verified" : "Signed in"} />
        </View>
        {!emailVerified && (
          <View style={styles.verify}>
            <View style={styles.verifyHead}>
              <Ionicons name="mail-unread-outline" size={18} color={colors.gold} />
              <Text style={styles.verifyText}>Verify your email to vote and appear on the leaderboard.</Text>
            </View>
            <View style={styles.verifyButtons}>
              <Button label="Resend email" variant="secondary" onPress={handleResend} loading={sending} style={styles.flex} />
              <Button label="I've verified" variant="secondary" onPress={handleCheck} loading={checking} style={styles.flex} />
            </View>
          </View>
        )}
        <ListRow
          icon="trophy-outline"
          iconColor={colors.gold}
          label="Show me on the leaderboard"
          subtitle={emailVerified ? "Shares your name, level, XP and streak" : "Requires a verified email"}
          toggle={{ value: leaderboardOptIn, onChange: setOptIn, disabled: !emailVerified }}
        />
        <ListRow icon="log-out-outline" iconColor={colors.subtext} label="Sign out" onPress={confirmSignOut} trailing="none" />
        <ListRow icon="trash-outline" label="Delete account" destructive onPress={() => setDeleteOpen(true)} trailing="none" last />
      </Card>
    ) : (
      <Card>
        <View style={styles.signInHead}>
          <View style={styles.cloudIcon}>
            <Ionicons name="cloud-upload-outline" size={22} color={colors.accent} />
          </View>
          <View style={styles.flex}>
            <Text style={styles.signInTitle}>Back up your progress</Text>
            <Text style={styles.signInText}>Optional. Save level, streaks and badges, vote on countries and join the leaderboard.</Text>
          </View>
        </View>
        <Button label="Sign in or create account" icon="person-add-outline" onPress={() => router.push("/auth")} />
      </Card>
    )
  ) : null;

  const badges = (
    <Card>
      <SectionHeader title="Achievements" caption={`${unlockedCount} of ${badgeDefinitions.length} unlocked`} />
      <View style={styles.badgeGrid}>
        {badgeDefinitions.map((badge) => (
          <Badge
            key={badge.id}
            badge={badge}
            unlocked={gamification.unlockedBadgeIds.includes(badge.id)}
            style={badgeStyle}
          />
        ))}
      </View>
    </Card>
  );

  const settingsCard = (
    <Card padded={false}>
      <ListRow icon="settings-outline" label="Settings" subtitle="Preferences, your data, help and legal" onPress={() => router.push("/settings")} last />
    </Card>
  );

  return (
    <>
      <Screen
        inTabs={false}
        width={columns > 1 ? "wide" : "readable"}
        refreshing={refreshing}
        onRefresh={onRefresh}
      >
        {columns > 1 ? (
          <View style={styles.split}>
            <View style={styles.splitCol}>
              {levelCard}
              {scans.length > 0 && <ShareStatsButton scans={scans} gamification={gamification} stats={stats} />}
              {accountCard}
              {settingsCard}
            </View>
            <View style={[styles.splitCol, { flex: 1.3 }]}>{badges}</View>
          </View>
        ) : (
          <>
            {levelCard}
            {scans.length > 0 && <ShareStatsButton scans={scans} gamification={gamification} stats={stats} />}
            {accountCard}
            {badges}
            {settingsCard}
          </>
        )}
      </Screen>

      <DeleteAccountSheet
        visible={deleteOpen}
        email={user?.email ?? null}
        onCancel={() => setDeleteOpen(false)}
        onConfirm={async (password) => {
          const err = await deleteAccount(password);
          if (err) return err.message;
          setDeleteOpen(false);
          Alert.alert("Account deleted", "Your account and cloud data have been deleted.");
          return null;
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
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
  levelHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  levelBadge: {
    position: "absolute",
    bottom: -2,
    right: -2,
    minWidth: 26,
    height: 26,
    paddingHorizontal: 6,
    borderRadius: 13,
    backgroundColor: colors.gold,
    borderWidth: 3,
    borderColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  levelBadgeText: {
    fontSize: 11,
    fontWeight: "900",
    color: "#3A2500",
    fontVariant: ["tabular-nums"],
  },
  email: {
    ...typography.caption,
    color: colors.subtext,
    fontWeight: "500",
  },
  guestAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.panelStrong,
    alignItems: "center",
    justifyContent: "center",
  },
  levelHeaderText: {
    flex: 1,
    gap: spacing.xs + 2,
  },
  name: {
    ...typography.title,
    color: colors.text,
  },
  levelRow: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
  },
  levelValue: {
    ...typography.display,
    color: colors.text,
  },
  xpText: {
    ...typography.bodyStrong,
    color: colors.gold,
    fontVariant: ["tabular-nums"],
  },
  nextText: {
    ...typography.caption,
    color: colors.subtext,
    marginTop: spacing.sm,
  },
  miniStats: {
    flexDirection: "row",
    marginTop: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  miniStat: {
    flex: 1,
    alignItems: "center",
    gap: 2,
  },
  miniValue: {
    ...typography.bodyStrong,
    color: colors.text,
    fontVariant: ["tabular-nums"],
  },
  miniLabel: {
    ...typography.caption,
    color: colors.muted,
    fontSize: 11,
  },
  mergeNotice: {
    ...typography.caption,
    color: colors.accent,
    marginTop: spacing.md,
  },
  cardHead: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  verify: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    backgroundColor: "rgba(251, 191, 36, 0.08)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(251, 191, 36, 0.3)",
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.md,
  },
  verifyHead: {
    flexDirection: "row",
    gap: spacing.sm,
    alignItems: "center",
  },
  verifyText: {
    ...typography.caption,
    color: colors.text,
    flex: 1,
  },
  verifyButtons: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  signInHead: {
    flexDirection: "row",
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  cloudIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "rgba(142, 166, 255, 0.14)",
    alignItems: "center",
    justifyContent: "center",
  },
  signInTitle: {
    ...typography.heading,
    color: colors.text,
  },
  signInText: {
    ...typography.body,
    color: colors.subtext,
    marginTop: 2,
  },
  badgeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: "-1%",
    rowGap: spacing.sm,
  },
});
