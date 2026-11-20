import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors, radius, spacing, typography } from "../../constants/theme";
import { openCountry } from "../../lib/navigation";
import type { ScanRecord } from "../../lib/types";
import { Flag } from "../ui/Flag";

/** "Instead, you've found these fine": same-category products from your own History. */
export function AlternativesRow({ items }: { items: ScanRecord[] }) {
  if (items.length === 0) return null;
  return (
    <View style={styles.root}>
      <View style={styles.head}>
        <Ionicons name="swap-horizontal" size={16} color={colors.positive} />
        <Text style={styles.title}>Instead, you&apos;ve found these fine</Text>
      </View>
      {items.map((s) => (
        <Pressable
          key={s.id}
          onPress={() => openCountry(s.country)}
          style={({ pressed }) => [styles.item, pressed && { opacity: 0.7 }]}
          accessibilityRole="button"
          accessibilityLabel={`${s.productName ?? s.country}, ${s.country}, fine`}
          accessibilityHint="Opens country details"
        >
          <Flag country={s.country} size={20} />
          <View style={styles.flex}>
            <Text style={styles.name} numberOfLines={1}>
              {s.productName ?? s.country}
            </Text>
            <Text style={styles.sub} numberOfLines={1}>
              {[s.brand, s.country].filter(Boolean).join(" · ")}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={colors.muted} />
        </Pressable>
      ))}
      <Text style={styles.note}>From your own scans, in the same category.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: spacing.sm,
    marginTop: spacing.lg,
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: "rgba(74,222,155,0.06)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(74,222,155,0.3)",
  },
  head: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  title: {
    ...typography.bodyStrong,
    color: colors.text,
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    minHeight: 48,
  },
  flex: {
    flex: 1,
  },
  name: {
    ...typography.bodyStrong,
    color: colors.text,
  },
  sub: {
    ...typography.caption,
    color: colors.subtext,
  },
  note: {
    ...typography.caption,
    fontSize: 11,
    color: colors.muted,
  },
});
