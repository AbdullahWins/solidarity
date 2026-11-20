import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";

import { colors, layout, radius, spacing, typography } from "../../constants/theme";
import { useBasket } from "../../hooks/useBasket";
import type { BasketItem } from "../../lib/basket";
import { Card } from "../ui/Card";
import { Flag } from "../ui/Flag";

const TONE_COLOR = { positive: colors.positive, negative: colors.negative, neutral: colors.subtext } as const;
const TONE_LABEL = { positive: "Fine", negative: "Avoid", neutral: "Neutral" } as const;

export type BasketNotice =
  | { kind: "added"; item: Pick<BasketItem, "code" | "country" | "tone" | "productName"> }
  | { kind: "duplicate"; country: string };

type Props = {
  notice: BasketNotice | null;
  onUndo: (code: string) => void;
};

/** Live basket counts, the last scanned item (with undo) and a link to the summary. */
export function BasketBar({ notice, onUndo }: Props) {
  const { counts } = useBasket();

  return (
    <Card style={styles.card}>
      <Pressable
        onPress={() => router.push("/basket")}
        style={({ pressed }) => [styles.summary, pressed && { opacity: 0.75 }]}
        accessibilityRole="button"
        accessibilityLabel={`Basket: ${counts.total} items, ${counts.positive} fine, ${counts.negative} to avoid, ${counts.neutral} neutral. Opens the summary.`}
      >
        <View style={styles.cartIcon}>
          <Ionicons name="basket" size={20} color={colors.accent} />
        </View>
        <View style={styles.flex}>
          <Text style={styles.title}>
            {counts.total === 0 ? "Basket is empty" : `${counts.total} item${counts.total === 1 ? "" : "s"}`}
          </Text>
          <View style={styles.counts}>
            {(["positive", "negative", "neutral"] as const).map((tone) => (
              <Text key={tone} style={[styles.count, { color: TONE_COLOR[tone] }]}>
                {counts[tone]} {TONE_LABEL[tone].toLowerCase()}
              </Text>
            ))}
          </View>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.muted} />
      </Pressable>

      {notice ? (
        <Animated.View entering={FadeIn.duration(150)} exiting={FadeOut.duration(150)} style={styles.notice}>
          {notice.kind === "added" ? (
            <>
              <Flag country={notice.item.country} size={18} />
              <Text style={styles.noticeText} numberOfLines={1}>
                {notice.item.productName ?? notice.item.country}
                <Text style={{ color: TONE_COLOR[notice.item.tone] }}>{`  ${TONE_LABEL[notice.item.tone]}`}</Text>
              </Text>
              <Pressable
                onPress={() => onUndo(notice.item.code)}
                style={styles.undo}
                accessibilityRole="button"
                accessibilityLabel={`Undo adding ${notice.item.country}`}
              >
                <Text style={styles.undoText}>Undo</Text>
              </Pressable>
            </>
          ) : (
            <>
              <Ionicons name="checkmark-done" size={16} color={colors.subtext} />
              <Text style={styles.noticeText}>Already in basket</Text>
            </>
          )}
        </Animated.View>
      ) : (
        <Text style={styles.hint}>Point the camera at each product. It keeps scanning.</Text>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.md,
  },
  flex: {
    flex: 1,
  },
  summary: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    minHeight: layout.touch,
  },
  cartIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(142, 166, 255, 0.14)",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    ...typography.heading,
    color: colors.text,
  },
  counts: {
    flexDirection: "row",
    gap: spacing.md,
    marginTop: 2,
  },
  count: {
    ...typography.caption,
    fontWeight: "700",
  },
  notice: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    minHeight: layout.touch,
    paddingHorizontal: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.panel,
  },
  noticeText: {
    ...typography.bodyStrong,
    color: colors.text,
    flex: 1,
  },
  undo: {
    minHeight: layout.touch,
    justifyContent: "center",
    paddingHorizontal: spacing.sm,
  },
  undoText: {
    ...typography.bodyStrong,
    color: colors.accent,
  },
  hint: {
    ...typography.caption,
    color: colors.muted,
  },
});
