import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";

import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { EmptyState } from "../components/ui/EmptyState";
import { Screen } from "../components/ui/Screen";
import { colors, spacing, typography } from "../constants/theme";
import { backupSummary } from "../lib/backup";
import { applyBackup, getPendingImport, setPendingImport } from "../lib/backupIO";

/** Shows what a picked backup contains and merges it after confirmation. */
export default function BackupPreviewScreen() {
  const [backup] = useState(getPendingImport);
  const [busy, setBusy] = useState(false);

  if (!backup) {
    return (
      <Screen inTabs={false}>
        <EmptyState icon="document-outline" title="No backup selected" text="Choose Import data in Settings to pick a file." />
      </Screen>
    );
  }

  const summary = backupSummary(backup);
  const when = summary.exportedAt ? new Date(summary.exportedAt).toLocaleString() : "an unknown date";

  const confirm = async () => {
    setBusy(true);
    try {
      const result = await applyBackup(backup);
      setPendingImport(null);
      Alert.alert(
        "Backup imported",
        `Added ${result.added.toLocaleString()} scan${result.added === 1 ? "" : "s"} and ${result.rules} rule${result.rules === 1 ? "" : "s"}. Your progress was recalculated.`
      );
      if (router.canGoBack()) router.back();
    } catch {
      Alert.alert("Import failed", "Nothing was changed. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen inTabs={false}>
      <Card>
        <View style={styles.head}>
          <Ionicons name="document-text-outline" size={22} color={colors.accent} />
          <Text style={styles.title}>Solidarity backup</Text>
        </View>
        <Text style={styles.meta}>Made {when}</Text>
        <View style={styles.counts}>
          <View style={styles.count}>
            <Text style={styles.value}>{summary.scans.toLocaleString()}</Text>
            <Text style={styles.label}>Scans</Text>
          </View>
          <View style={styles.count}>
            <Text style={styles.value}>{summary.rules}</Text>
            <Text style={styles.label}>Rules</Text>
          </View>
        </View>
      </Card>
      <Text style={styles.note}>
        {"Importing adds these to what's already on this device. Nothing is deleted, scans already here aren't duplicated, "}
        {"and your own rules are kept. XP, level and streaks are recalculated from the scans."}
      </Text>
      <Button label="Import" icon="download-outline" onPress={confirm} loading={busy} />
      <Button label="Cancel" variant="secondary" onPress={() => router.back()} disabled={busy} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  head: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  title: {
    ...typography.title,
    color: colors.text,
  },
  meta: {
    ...typography.caption,
    color: colors.subtext,
    marginTop: spacing.xs,
  },
  counts: {
    flexDirection: "row",
    marginTop: spacing.lg,
  },
  count: {
    flex: 1,
    alignItems: "center",
  },
  value: {
    ...typography.stat,
    color: colors.text,
  },
  label: {
    ...typography.overline,
    color: colors.subtext,
    marginTop: 2,
  },
  note: {
    ...typography.body,
    color: colors.subtext,
  },
});
