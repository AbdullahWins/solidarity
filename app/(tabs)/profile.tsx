import { Ionicons } from "@expo/vector-icons";
import { router, Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useState } from "react";
import { Alert, ScrollView, StyleSheet, Switch, Text, View } from "react-native";

import { ShareStatsButton } from "../../components/share/ShareStatsButton";
import { RankTitle } from "../../components/gamification/RankTitle";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { ProgressBar } from "../../components/ui/ProgressBar";
import { ScreenContainer } from "../../components/ui/ScreenContainer";
import { SectionHeader } from "../../components/ui/SectionHeader";
import { useAuth } from "../../contexts/AuthContext";
import { colors, spacing, typography } from "../../constants/theme";
import { useCloudSync } from "../../hooks/useCloudSync";
import { useScanHistory } from "../../hooks/useScanHistory";
import { badgeDefinitions } from "../../lib/badges";
import { levelProgress } from "../../lib/gamification";

export default function ProfileScreen() {
  const { scans, gamification, stats } = useScanHistory();
  const {
    user,
    emailVerified,
    isFirebaseConfigured,
    signOut,
    deleteAccount,
    resendVerificationEmail,
    refreshVerificationStatus,
  } = useAuth();
  const { mergeNotice, leaderboardOptIn, setOptIn, displayGamification } = useCloudSync(
    scans,
    gamification
  );
  const [deleting, setDeleting] = useState(false);
  const [sendingVerification, setSendingVerification] = useState(false);
  const [checkingVerification, setCheckingVerification] = useState(false);

  const effectiveXp = displayGamification?.xp ?? gamification.xp;
  const effectiveStreak = displayGamification?.currentStreak ?? gamification.currentStreak;
  const effectiveLongestStreak = displayGamification?.longestStreak ?? gamification.longestStreak;
  const { level, progress, nextThreshold } = levelProgress(effectiveXp);

  const handleResendVerification = async () => {
    setSendingVerification(true);
    const err = await resendVerificationEmail();
    setSendingVerification(false);
    if (err) {
      Alert.alert("Couldn't send email", err.message);
    } else {
      Alert.alert("Verification email sent", "Check your inbox, then tap \"I've verified\".");
    }
  };

  const handleCheckVerification = async () => {
    setCheckingVerification(true);
    const verified = await refreshVerificationStatus();
    setCheckingVerification(false);
    if (!verified) {
      Alert.alert("Not verified yet", "We couldn't confirm your email is verified yet.");
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      "Delete account",
      "This permanently removes your cloud backup (level, streaks, badges). Your on-device scan history stays put.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setDeleting(true);
            const err = await deleteAccount();
            setDeleting(false);
            if (err) Alert.alert("Couldn't delete account", err.message);
          },
        },
      ]
    );
  };

  return (
    <>
      <Stack.Screen options={{ title: "Profile" }} />
      <ScreenContainer>
        <StatusBar style="light" />
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Card style={styles.levelCard}>
            <View style={styles.levelHeader}>
              <Text style={styles.levelValue}>Level {level}</Text>
              <RankTitle level={level} />
            </View>
            <ProgressBar progress={progress} />
            <Text style={styles.xpText}>
              {effectiveXp} XP · {Math.max(nextThreshold - effectiveXp, 0)} to next level
            </Text>
            <View style={styles.streakRow}>
              <Ionicons name="flame" size={20} color={colors.gold} />
              <Text style={styles.streakText}>
                {effectiveStreak}-day streak (best {effectiveLongestStreak}d)
              </Text>
            </View>
            {mergeNotice && <Text style={styles.mergeNotice}>{mergeNotice}</Text>}
          </Card>

          {isFirebaseConfigured && (
            <Card>
              <SectionHeader title="Account" />
              {user ? (
                <View style={{ gap: spacing.sm }}>
                  <Text style={styles.accountText}>{user.displayName || "Scanner"}</Text>
                  <Text style={styles.accountSubtext}>{user.email}</Text>

                  {!emailVerified && (
                    <View style={styles.verifyBanner}>
                      <Text style={styles.verifyText}>
                        Verify your email to appear on the public leaderboard.
                      </Text>
                      <View style={styles.verifyButtons}>
                        <Button
                          label="Resend Email"
                          variant="secondary"
                          onPress={handleResendVerification}
                          loading={sendingVerification}
                          style={{ flex: 1 }}
                        />
                        <Button
                          label="I've Verified"
                          variant="secondary"
                          onPress={handleCheckVerification}
                          loading={checkingVerification}
                          style={{ flex: 1 }}
                        />
                      </View>
                    </View>
                  )}

                  <View style={styles.optInRow}>
                    <Text style={styles.accountText}>Show me on the public leaderboard</Text>
                    <Switch
                      value={leaderboardOptIn}
                      onValueChange={setOptIn}
                      disabled={!emailVerified}
                    />
                  </View>
                  <Button label="Sign Out" variant="ghost" onPress={signOut} />
                  <Button
                    label="Delete Account"
                    variant="ghost"
                    onPress={handleDeleteAccount}
                    loading={deleting}
                    style={{ marginTop: -spacing.xs }}
                  />
                </View>
              ) : (
                <View style={{ gap: spacing.sm }}>
                  <Text style={styles.accountText}>
                    Sign in to back up your level, streak, and badges to the cloud — and join the
                    leaderboard.
                  </Text>
                  <Button label="Sign In / Sign Up" onPress={() => router.push("/auth")} />
                </View>
              )}
            </Card>
          )}

          {scans.length > 0 && (
            <ShareStatsButton scans={scans} gamification={gamification} stats={stats} />
          )}

          <Card>
            <SectionHeader title="Achievements" />
            <View style={styles.badgeGrid}>
              {badgeDefinitions.map((badge) => (
                <Badge
                  key={badge.id}
                  badge={badge}
                  unlocked={gamification.unlockedBadgeIds.includes(badge.id)}
                />
              ))}
            </View>
          </Card>
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
    gap: spacing.md,
  },
  levelCard: {
    gap: spacing.sm,
  },
  levelHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  levelValue: {
    ...typography.display,
    color: colors.gold,
  },
  xpText: {
    ...typography.caption,
    color: colors.subtext,
  },
  streakRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  streakText: {
    ...typography.body,
    color: colors.text,
    fontWeight: "700",
  },
  mergeNotice: {
    ...typography.caption,
    color: colors.accent,
    marginTop: spacing.xs,
  },
  accountText: {
    ...typography.body,
    color: colors.text,
    fontWeight: "700",
  },
  accountSubtext: {
    ...typography.caption,
    color: colors.subtext,
    marginTop: -spacing.xs,
  },
  verifyBanner: {
    backgroundColor: colors.panelSoft,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: spacing.sm,
    gap: spacing.sm,
  },
  verifyText: {
    ...typography.caption,
    color: colors.subtext,
  },
  verifyButtons: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  optInRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  badgeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
});
