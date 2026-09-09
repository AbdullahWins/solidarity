import { Ionicons } from "@expo/vector-icons";
import Constants from "expo-constants";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useState } from "react";
import { Alert, Image, ScrollView, Share, StyleSheet, Switch, Text, TouchableOpacity, View } from "react-native";
import * as WebBrowser from "expo-web-browser";

import { Card } from "../../components/ui/Card";
import { ScreenContainer } from "../../components/ui/ScreenContainer";
import { SectionHeader } from "../../components/ui/SectionHeader";
import { APP_NAME, APP_SHARE_URL } from "../../constants/app-info";
import { colors, radius, spacing, typography } from "../../constants/theme";
import { usePreferences } from "../../hooks/usePreferences";
import { useScanHistory } from "../../hooks/useScanHistory";
import {
  cancelStreakReminder,
  requestNotificationPermission,
  scheduleStreakReminder,
} from "../../lib/notifications";

export default function SettingsScreen() {
  const { preferences, update } = usePreferences();
  const { clearHistory } = useScanHistory();
  const [togglingReminder, setTogglingReminder] = useState(false);

  const openStoreLink = () => {
    WebBrowser.openBrowserAsync(APP_SHARE_URL).catch(() => {});
  };

  const shareApp = () => {
    Share.share({
      message: `Check out ${APP_NAME} — know what you buy: ${APP_SHARE_URL}`,
    }).catch(() => {});
  };

  const toggleStreakReminder = async (value: boolean) => {
    setTogglingReminder(true);
    if (value) {
      const granted = await requestNotificationPermission();
      if (!granted) {
        Alert.alert(
          "Notifications disabled",
          "Enable notifications for Solidarity in your device settings to get streak reminders."
        );
        setTogglingReminder(false);
        return;
      }
      await scheduleStreakReminder();
    } else {
      await cancelStreakReminder();
    }
    await update({ streakReminderEnabled: value });
    setTogglingReminder(false);
  };

  const handleClearHistory = () => {
    Alert.alert(
      "Clear scan history",
      "This permanently deletes all scans, streaks, XP, and badges on this device. This can't be undone.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Clear Everything", style: "destructive", onPress: () => clearHistory() },
      ]
    );
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: "Settings",
          headerTitleStyle: { fontSize: 17 },
          headerRight: () => (
            <Image
              source={require("../../assets/images/icon.png")}
              accessibilityLabel="Solidarity Logo"
              accessibilityRole="image"
              style={{ width: 28, height: 28, marginRight: 10, borderRadius: 6 }}
            />
          ),
        }}
      />
      <ScreenContainer>
        <StatusBar style="light" />
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Card>
            <SectionHeader title="Preferences" />
            <View style={styles.row}>
              <View style={styles.rowText}>
                <Text style={styles.rowLabel}>Haptic feedback</Text>
                <Text style={styles.rowSubtext}>Vibrate on scan results and level-ups</Text>
              </View>
              <Switch
                value={preferences.hapticsEnabled}
                onValueChange={(value) => update({ hapticsEnabled: value })}
              />
            </View>
            <View style={styles.row}>
              <View style={styles.rowText}>
                <Text style={styles.rowLabel}>Streak reminders</Text>
                <Text style={styles.rowSubtext}>Daily nudge at 7pm if you haven&apos;t scanned</Text>
              </View>
              <Switch
                value={preferences.streakReminderEnabled}
                onValueChange={toggleStreakReminder}
                disabled={togglingReminder}
              />
            </View>
          </Card>

          <Card>
            <SectionHeader title="Data" />
            <TouchableOpacity style={styles.linkRow} onPress={handleClearHistory}>
              <Ionicons name="trash" size={16} color={colors.negativeStrong} />
              <Text style={[styles.linkText, { color: colors.negativeStrong }]}>
                Clear scan history
              </Text>
            </TouchableOpacity>
          </Card>

          <Card>
            <SectionHeader title="About" />
            <Text style={styles.sectionTitle}>How It Works</Text>
            <Text style={styles.paragraph}>
              We read the GS1 prefix and map it to its country range.
            </Text>
            <Text style={[styles.sectionTitle, { marginTop: spacing.md }]}>
              Important Context
            </Text>
            <Text style={styles.paragraph}>
              This is barcode registration, not always manufacturing origin.
            </Text>
            <Text style={[styles.sectionTitle, { marginTop: spacing.md }]}>
              Community-Driven Ratings
            </Text>
            <Text style={styles.paragraph}>
              A country&apos;s color is decided by open voting from the Solidarity community —
              never asserted by us. Anyone can see the vote counts; verified members can
              vote or change their vote at any time from the Community tab.
            </Text>
            <Text style={[styles.sectionTitle, { marginTop: spacing.md }]}>Privacy First</Text>
            <Text style={styles.paragraph}>
              Scanning always happens on-device. If you optionally create an account, we
              back up a small summary of your progress (level, streak, badges) to the
              cloud so you don&apos;t lose it — your individual scan history and barcodes
              never leave your phone.
            </Text>
          </Card>

          <Card>
            <SectionHeader title={`Enjoying ${APP_NAME}?`} />
            <TouchableOpacity style={styles.linkRow} onPress={shareApp}>
              <Ionicons name="share-social" size={16} color={colors.accent} />
              <Text style={styles.linkText}>Share {APP_NAME}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.linkRow} onPress={openStoreLink}>
              <Ionicons name="star" size={16} color={colors.gold} />
              <Text style={styles.linkText}>Rate on the Play Store</Text>
            </TouchableOpacity>
          </Card>

          <Text style={styles.footer}>
            {APP_NAME} v{Constants.expoConfig?.version ?? "1.0"} · Built with ❤️ and Solidarity.
          </Text>
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
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.sm,
  },
  rowText: {
    flex: 1,
    paddingRight: spacing.md,
  },
  rowLabel: {
    ...typography.body,
    color: colors.text,
    fontWeight: "700",
  },
  rowSubtext: {
    ...typography.caption,
    color: colors.subtext,
    marginTop: 2,
  },
  sectionTitle: {
    ...typography.heading,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  paragraph: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.subtext,
  },
  linkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: spacing.sm,
    backgroundColor: colors.panelSoft,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
  },
  linkText: {
    ...typography.body,
    color: colors.text,
    fontWeight: "700",
  },
  footer: {
    fontSize: 12,
    textAlign: "center",
    color: colors.muted,
    marginTop: spacing.sm,
  },
});
