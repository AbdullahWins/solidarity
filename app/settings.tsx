import Constants from "expo-constants";
import { Image } from "expo-image";
import { router } from "expo-router";
import React, { useState } from "react";
import { Alert, Platform, Share, StyleSheet, Text, View } from "react-native";

import { Card } from "../components/ui/Card";
import { ListRow } from "../components/ui/ListRow";
import { Screen } from "../components/ui/Screen";
import { APP_NAME, APP_SHARE_URL, LINKS } from "../constants/app-info";
import { colors, spacing, typography } from "../constants/theme";
import { useBrandRules } from "../hooks/useBrandRules";
import { useCountryRules } from "../hooks/useCountryRules";
import { useLayout } from "../hooks/useLayout";
import { BackupError } from "../lib/backup";
import { exportBackup, pickBackup, setPendingImport } from "../lib/backupIO";
import { usePreferences } from "../hooks/usePreferences";
import { useScanHistory } from "../hooks/useScanHistory";
import { openInAppBrowser, openStoreReview } from "../lib/links";
import { cancelStreakReminders, requestNotificationPermission, scheduleStreakReminders } from "../lib/notifications";

const logo = require("../assets/images/logo.png");

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.group}>
      <Text style={styles.groupTitle} accessibilityRole="header">
        {title}
      </Text>
      <Card padded={false}>{children}</Card>
    </View>
  );
}

export default function SettingsScreen() {
  const { preferences, update } = usePreferences();
  const ruleCount = Object.keys(useCountryRules()).length + Object.keys(useBrandRules()).length;
  const { gamification, clearHistory, scans } = useScanHistory();
  const { columns } = useLayout();
  const [togglingReminder, setTogglingReminder] = useState(false);

  const version = Constants.expoConfig?.version ?? "1.0.0";
  const build =
    Platform.OS === "ios" ? Constants.expoConfig?.ios?.buildNumber : Constants.expoConfig?.android?.versionCode?.toString();

  const shareApp = () => {
    Share.share({ message: `${APP_NAME}: scan a barcode, see where it's registered, and vote with the community. ${APP_SHARE_URL}` }).catch(
      () => {}
    );
  };

  const toggleReminder = async (value: boolean) => {
    setTogglingReminder(true);
    try {
      if (value) {
        const granted = await requestNotificationPermission();
        if (!granted) {
          Alert.alert(
            "Notifications are off",
            "Allow notifications for Solidarity in your device settings to get streak reminders."
          );
          return;
        }
        await scheduleStreakReminders(gamification.lastScanLocalDate);
      } else {
        await cancelStreakReminders();
      }
      update({ streakReminderEnabled: value });
    } finally {
      setTogglingReminder(false);
    }
  };

  const confirmClear = () =>
    Alert.alert(
      "Clear scan history?",
      "Deletes every scan on this device, with the XP, streaks and badges earned from scanning. XP from voting is kept. This can't be undone.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Clear history", style: "destructive", onPress: () => void clearHistory() },
      ]
    );

  const preferencesGroup = (
    <Group title="Preferences">
      <ListRow
        icon="phone-portrait-outline"
        label="Haptic feedback"
        subtitle="Vibrate on scans, votes and level-ups"
        toggle={{ value: preferences.hapticsEnabled, onChange: (v) => update({ hapticsEnabled: v }) }}
      />
      <ListRow
        icon="pricetag-outline"
        label="Product names"
        subtitle="From Open Food Facts. Sends only the barcode."
        toggle={{
          value: preferences.productLookup === "on",
          onChange: (v) => update({ productLookup: v ? "on" : "off" }),
        }}
        last={Platform.OS === "web"}
      />
      {Platform.OS !== "web" ? (
        <ListRow
          icon="notifications-outline"
          iconColor={colors.gold}
          label="Streak reminders"
          subtitle="7 pm nudge, only on days you haven't scanned"
          toggle={{ value: preferences.streakReminderEnabled, onChange: toggleReminder, disabled: togglingReminder }}
          last
        />
      ) : null}
    </Group>
  );

  const onExport = async () => {
    try {
      await exportBackup();
    } catch (err) {
      Alert.alert("Export failed", err instanceof BackupError ? err.message : "Please try again.");
    }
  };

  const onImport = async () => {
    try {
      const backup = await pickBackup();
      if (!backup) return;
      setPendingImport(backup);
      router.push("/backup-preview");
    } catch (err) {
      Alert.alert("Can't import", err instanceof BackupError ? err.message : "This file couldn't be read.");
    }
  };

  const dataGroup = (
    <Group title="Your data">
      <ListRow
        icon="shield-checkmark-outline"
        label="My rules"
        subtitle={`${ruleCount} rule${ruleCount === 1 ? "" : "s"} · countries, brands and companies, on this device only`}
        onPress={() => router.push("/rules")}
      />
      <ListRow
        icon="share-outline"
        label="Export my data"
        subtitle="Scans, progress and rules as a file. Includes your scan history"
        onPress={onExport}
      />
      <ListRow
        icon="download-outline"
        label="Import data"
        subtitle="Add a Solidarity backup file to this device"
        onPress={onImport}
      />
      <ListRow
        icon="trash-outline"
        label="Clear scan history"
        subtitle={`${scans.length.toLocaleString()} scan${scans.length === 1 ? "" : "s"} stored on this device`}
        destructive
        onPress={confirmClear}
        trailing="none"
      />
      <ListRow
        icon="person-remove-outline"
        iconColor={colors.subtext}
        label="Delete account and data"
        subtitle="How deletion works, and requesting it without the app"
        onPress={() => openInAppBrowser(LINKS.deleteAccount)}
        trailing="external"
        last
      />
    </Group>
  );

  const legalGroup = (
    <Group title="Help & legal">
      <ListRow
        icon="play-circle-outline"
        iconColor={colors.brandSoft}
        label="Replay intro"
        subtitle="A quick tour of how Solidarity works"
        onPress={() => router.push("/onboarding")}
      />
      <ListRow icon="help-buoy-outline" label="Support & FAQ" onPress={() => openInAppBrowser(LINKS.support)} trailing="external" />
      <ListRow
        icon="shield-checkmark-outline"
        iconColor={colors.positive}
        label="Privacy policy"
        onPress={() => openInAppBrowser(LINKS.privacy)}
        trailing="external"
      />
      <ListRow
        icon="document-text-outline"
        iconColor={colors.subtext}
        label="Terms of service"
        onPress={() => openInAppBrowser(LINKS.terms)}
        trailing="external"
        last
      />
    </Group>
  );

  const shareGroup = (
    <Group title={`Enjoying ${APP_NAME}?`}>
      <ListRow icon="share-social-outline" label={`Share ${APP_NAME}`} onPress={shareApp} />
      <ListRow
        icon="star-outline"
        iconColor={colors.gold}
        label={Platform.OS === "ios" ? "Rate on the App Store" : "Rate on Google Play"}
        onPress={() => void openStoreReview()}
        trailing="external"
        last
      />
    </Group>
  );

  const about = (
    <Group title="About">
      <View style={styles.about}>
        {[
          { title: "How it works", text: "We read the barcode's GS1 prefix and match it to the country range it's registered in." },
          { title: "Important context", text: "Registration country isn't always where a product was made." },
          {
            title: "Community-driven ratings",
            text: "A country's colour is decided by open voting from the Solidarity community, never by us. Anyone can see the counts. Verified members can vote or change their vote at any time.",
          },
          {
            title: "Private by design",
            text: "Scanning happens on your device and your scan history never leaves it. With an optional account, a summary of your progress and your votes is backed up so you don't lose them.",
          },
        ].map((item) => (
          <View key={item.title} style={styles.aboutItem}>
            <Text style={styles.aboutTitle}>{item.title}</Text>
            <Text style={styles.aboutText}>{item.text}</Text>
          </View>
        ))}
      </View>
    </Group>
  );

  const footer = (
    <View style={styles.footer}>
      <Image source={logo} style={styles.logo} contentFit="contain" accessibilityLabel={`${APP_NAME} logo`} />
      <Text style={styles.footerName}>{APP_NAME}</Text>
      <Text style={styles.footerVersion}>
        Version {version}
        {build ? ` (${build})` : ""}
      </Text>
    </View>
  );

  return (
    <Screen inTabs={false} width={columns > 1 ? "wide" : "readable"}>
      {columns > 1 ? (
        <View style={styles.split}>
          <View style={styles.col}>
            {preferencesGroup}
            {dataGroup}
            {legalGroup}
          </View>
          <View style={styles.col}>
            {shareGroup}
            {about}
            {footer}
          </View>
        </View>
      ) : (
        <>
          {preferencesGroup}
          {dataGroup}
          {legalGroup}
          {shareGroup}
          {about}
          {footer}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  split: {
    flexDirection: "row",
    gap: spacing.lg,
    alignItems: "flex-start",
  },
  col: {
    flex: 1,
    gap: spacing.lg,
  },
  group: {
    gap: spacing.sm,
  },
  groupTitle: {
    ...typography.overline,
    color: colors.muted,
    marginLeft: spacing.xs,
  },
  about: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  aboutItem: {
    gap: 2,
  },
  aboutTitle: {
    ...typography.bodyStrong,
    color: colors.text,
  },
  aboutText: {
    ...typography.body,
    fontSize: 14,
    color: colors.subtext,
  },
  footer: {
    alignItems: "center",
    gap: spacing.xs,
    paddingVertical: spacing.lg,
  },
  logo: {
    width: 44,
    height: 44,
    borderRadius: 12,
    marginBottom: spacing.xs,
  },
  footerName: {
    ...typography.bodyStrong,
    color: colors.text,
  },
  footerVersion: {
    ...typography.caption,
    color: colors.muted,
  },
});
