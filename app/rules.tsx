import { Ionicons } from "@expo/vector-icons";
import React, { useMemo } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";

import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { EmptyState } from "../components/ui/EmptyState";
import { Flag } from "../components/ui/Flag";
import { Screen } from "../components/ui/Screen";
import { colors, layout, radius, spacing, typography } from "../constants/theme";
import { useBrandRules } from "../hooks/useBrandRules";
import { useCountryRules } from "../hooks/useCountryRules";
import { usePreferences } from "../hooks/usePreferences";
import { clearAllBrandRules, setBrandRule } from "../lib/brandRules";
import { clearAllRules, setRule } from "../lib/countryRules";
import { openCountry } from "../lib/navigation";
import { getVotableCountryNames, normalizeCountryKey } from "../lib/votes";

const NAME_BY_KEY = new Map(getVotableCountryNames().map((name) => [normalizeCountryKey(name), name]));

type Row = { key: string; rule: "avoid" | "support"; name: string };

const byRuleThenName = (a: Row, b: Row) =>
  a.rule === b.rule ? a.name.localeCompare(b.name) : a.rule === "avoid" ? -1 : 1;

function RulePill({ rule }: { rule: Row["rule"] }) {
  const avoid = rule === "avoid";
  return (
    <View style={[styles.pill, { backgroundColor: avoid ? "rgba(251,113,133,0.14)" : "rgba(74,222,155,0.14)" }]}>
      <Text style={[styles.pillText, { color: avoid ? colors.negative : colors.positive }]}>{avoid ? "Avoid" : "Support"}</Text>
    </View>
  );
}

function RuleList({
  rows,
  leading,
  onOpen,
  onRemove,
}: {
  rows: Row[];
  leading: (r: Row) => React.ReactNode;
  onOpen?: (r: Row) => void;
  onRemove: (r: Row) => void;
}) {
  return (
    <Card padded={false}>
      {rows.map((r, i) => (
        <View key={r.key} style={[styles.row, i < rows.length - 1 && styles.divider]}>
          <Pressable
            onPress={onOpen ? () => onOpen(r) : undefined}
            disabled={!onOpen}
            style={({ pressed }) => [styles.rowMain, pressed && { opacity: 0.7 }]}
            accessibilityRole={onOpen ? "button" : "text"}
            accessibilityLabel={`${r.name}, ${r.rule}`}
          >
            {leading(r)}
            <Text style={styles.name} numberOfLines={1}>
              {r.name}
            </Text>
            <RulePill rule={r.rule} />
          </Pressable>
          <Pressable
            onPress={() => onRemove(r)}
            style={({ pressed }) => [styles.remove, pressed && { opacity: 0.6 }]}
            accessibilityRole="button"
            accessibilityLabel={`Remove rule for ${r.name}`}
          >
            <Ionicons name="close" size={18} color={colors.muted} />
          </Pressable>
        </View>
      ))}
    </Card>
  );
}

export default function RulesScreen() {
  const countryRules = useCountryRules();
  const brandRules = useBrandRules();
  const { preferences, update } = usePreferences();

  // Country rules whose key no longer matches a votable country are left out.
  const countries = useMemo(
    () =>
      Object.entries(countryRules)
        .map(([key, rule]) => ({ key, rule, name: NAME_BY_KEY.get(key) }))
        .filter((r): r is Row => !!r.name)
        .sort(byRuleThenName),
    [countryRules]
  );
  const brands = useMemo(
    () => Object.entries(brandRules).map(([key, e]) => ({ key, rule: e.rule, name: e.label })).sort(byRuleThenName),
    [brandRules]
  );

  const confirmClearAll = () =>
    Alert.alert("Clear all rules?", "Your scan results will show the community verdict again.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Clear all",
        style: "destructive",
        onPress: () => {
          void clearAllRules();
          void clearAllBrandRules();
        },
      },
    ]);

  const productNamesOff = preferences.productLookup !== "on";

  return (
    <Screen inTabs={false}>
      <Text style={styles.intro}>
        Your own Avoid or Support choices. They lead your scan results, ahead of the community verdict, and never leave
        this device. A brand or company rule comes first, then a country rule.
      </Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Brands and companies</Text>
        {productNamesOff ? (
          <Card style={styles.note}>
            <Ionicons name="pricetag-outline" size={18} color={colors.accent} />
            <Text style={styles.noteText}>Brand rules need product names, so the app knows which brand you scanned.</Text>
            <Button label="Turn on product names" variant="secondary" onPress={() => void update({ productLookup: "on" })} />
          </Card>
        ) : null}
        {brands.length === 0 ? (
          <Text style={styles.empty}>
            None yet. Open a scan result&apos;s details and choose Avoid or Support for its brand or company.
          </Text>
        ) : (
          <RuleList
            rows={brands}
            leading={() => (
              <View style={styles.brandIcon}>
                <Ionicons name="business-outline" size={16} color={colors.subtext} />
              </View>
            )}
            onRemove={(r) => void setBrandRule(r.name, null)}
          />
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Countries</Text>
        {countries.length === 0 ? (
          brands.length === 0 ? (
            <EmptyState
              icon="shield-checkmark-outline"
              title="No rules yet"
              text="Open any country, or a scan result's details, and choose Avoid or Support."
            />
          ) : (
            <Text style={styles.empty}>None yet. Open any country and choose Avoid or Support.</Text>
          )
        ) : (
          <RuleList
            rows={countries}
            leading={(r) => <Flag country={r.name} size={22} />}
            onOpen={(r) => openCountry(r.name)}
            onRemove={(r) => void setRule(r.name, null)}
          />
        )}
      </View>

      {countries.length + brands.length > 0 ? (
        <Button label="Clear all rules" icon="trash-outline" variant="secondary" onPress={confirmClearAll} />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  intro: {
    ...typography.body,
    color: colors.subtext,
  },
  section: {
    gap: spacing.sm,
  },
  sectionTitle: {
    ...typography.overline,
    color: colors.muted,
    marginLeft: spacing.xs,
  },
  empty: {
    ...typography.caption,
    color: colors.muted,
    marginLeft: spacing.xs,
  },
  note: {
    gap: spacing.sm,
  },
  noteText: {
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
  brandIcon: {
    width: 32,
    height: 22,
    borderRadius: 6,
    backgroundColor: colors.panelStrong,
    alignItems: "center",
    justifyContent: "center",
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
