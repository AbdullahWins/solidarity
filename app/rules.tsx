import { Ionicons } from "@expo/vector-icons";
import React, { useMemo } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";

import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { EmptyState } from "../components/ui/EmptyState";
import { Flag } from "../components/ui/Flag";
import { Screen } from "../components/ui/Screen";
import { colors, layout, radius, spacing, typography } from "../constants/theme";
import { useCountryRules } from "../hooks/useCountryRules";
import { clearAllRules, setRule } from "../lib/countryRules";
import { openCountry } from "../lib/navigation";
import { getVotableCountryNames, normalizeCountryKey } from "../lib/votes";

const NAME_BY_KEY = new Map(getVotableCountryNames().map((name) => [normalizeCountryKey(name), name]));

export default function RulesScreen() {
  const rules = useCountryRules();

  // Rules whose key no longer matches a votable country are left out.
  const list = useMemo(
    () =>
      Object.entries(rules)
        .map(([key, rule]) => ({ key, rule, name: NAME_BY_KEY.get(key) }))
        .filter((r): r is { key: string; rule: "avoid" | "support"; name: string } => !!r.name)
        .sort((a, b) => (a.rule === b.rule ? a.name.localeCompare(b.name) : a.rule === "avoid" ? -1 : 1)),
    [rules]
  );

  const confirmClearAll = () =>
    Alert.alert("Clear all rules?", "Your scan results will show the community verdict again.", [
      { text: "Cancel", style: "cancel" },
      { text: "Clear all", style: "destructive", onPress: () => void clearAllRules() },
    ]);

  return (
    <Screen inTabs={false}>
      <Text style={styles.intro}>
        Your own Avoid or Support choices. They lead your scan results, ahead of the community verdict, and never leave
        this device.
      </Text>
      {list.length === 0 ? (
        <EmptyState
          icon="shield-checkmark-outline"
          title="No rules yet"
          text="Open any country, or a scan result's details, and choose Avoid or Support."
        />
      ) : (
        <>
          <Card padded={false}>
            {list.map((r, i) => {
              const tone = r.rule === "avoid" ? colors.negative : colors.positive;
              return (
                <View key={r.key} style={[styles.row, i < list.length - 1 && styles.divider]}>
                  <Pressable
                    onPress={() => openCountry(r.name)}
                    style={({ pressed }) => [styles.rowMain, pressed && { opacity: 0.7 }]}
                    accessibilityRole="button"
                    accessibilityLabel={`${r.name}, ${r.rule}`}
                    accessibilityHint="Opens country details"
                  >
                    <Flag country={r.name} size={22} />
                    <Text style={styles.name} numberOfLines={1}>
                      {r.name}
                    </Text>
                    <View style={[styles.pill, { backgroundColor: r.rule === "avoid" ? "rgba(251,113,133,0.14)" : "rgba(74,222,155,0.14)" }]}>
                      <Text style={[styles.pillText, { color: tone }]}>{r.rule === "avoid" ? "Avoid" : "Support"}</Text>
                    </View>
                  </Pressable>
                  <Pressable
                    onPress={() => void setRule(r.name, null)}
                    style={({ pressed }) => [styles.remove, pressed && { opacity: 0.6 }]}
                    accessibilityRole="button"
                    accessibilityLabel={`Remove rule for ${r.name}`}
                  >
                    <Ionicons name="close" size={18} color={colors.muted} />
                  </Pressable>
                </View>
              );
            })}
          </Card>
          <Button label="Clear all rules" icon="trash-outline" variant="secondary" onPress={confirmClearAll} />
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  intro: {
    ...typography.body,
    color: colors.subtext,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: spacing.lg,
    paddingRight: spacing.sm,
  },
  divider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  rowMain: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    minHeight: 56,
  },
  name: {
    ...typography.bodyStrong,
    color: colors.text,
    flex: 1,
  },
  pill: {
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  pillText: {
    ...typography.caption,
    fontWeight: "800",
  },
  remove: {
    width: layout.touch,
    height: layout.touch,
    alignItems: "center",
    justifyContent: "center",
  },
});
