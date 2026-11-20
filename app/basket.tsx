import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import { Alert, Pressable, Share, StyleSheet, Text, View } from "react-native";

import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { EmptyState } from "../components/ui/EmptyState";
import { Flag } from "../components/ui/Flag";
import { Screen } from "../components/ui/Screen";
import { colors, layout, spacing, typography } from "../constants/theme";
import { useBasket } from "../hooks/useBasket";
import { basketShareText, finishBasket, removeFromBasket, type BasketItem, type Tone } from "../lib/basket";

const SECTIONS: { tone: Tone; title: string; color: string; icon: React.ComponentProps<typeof Ionicons>["name"] }[] = [
  { tone: "negative", title: "Avoid", color: colors.negative, icon: "alert-circle" },
  { tone: "positive", title: "Fine", color: colors.positive, icon: "checkmark-circle" },
  { tone: "neutral", title: "Neutral", color: colors.subtext, icon: "help-circle" },
];

function Row({ item, last }: { item: BasketItem; last: boolean }) {
  return (
    <View style={[styles.row, !last && styles.divider]}>
      <Flag country={item.country} size={22} />
      <View style={styles.rowMain}>
        <Text style={styles.rowTitle} numberOfLines={1}>
          {item.productName ?? item.country}
        </Text>
        {item.productName ? <Text style={styles.rowSub}>{item.country}</Text> : null}
      </View>
      <Pressable
        onPress={() => void removeFromBasket(item.code)}
        style={({ pressed }) => [styles.remove, pressed && { opacity: 0.6 }]}
        accessibilityRole="button"
        accessibilityLabel={`Remove ${item.productName ?? item.country} from basket`}
      >
        <Ionicons name="close" size={18} color={colors.muted} />
      </Pressable>
    </View>
  );
}

export default function BasketScreen() {
  const { basket, counts } = useBasket();

  const share = () => void Share.share({ message: basketShareText(basket.items) }).catch(() => {});

  const finish = () =>
    Alert.alert("Finish basket?", "This clears the list. Your scans stay in History.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Finish",
        onPress: async () => {
          await finishBasket();
          if (router.canGoBack()) router.back();
        },
      },
    ]);

  return (
    <Screen inTabs={false}>
      {basket.items.length === 0 ? (
        <EmptyState
          icon="basket-outline"
          title="Your basket is empty"
          text="Turn on Basket on the Scan tab and scan each product. It keeps scanning."
        />
      ) : (
        <>
          <Card>
            <Text style={styles.total}>
              {counts.total} item{counts.total === 1 ? "" : "s"}
            </Text>
            <View style={styles.countsRow}>
              {SECTIONS.map((s) => (
                <View key={s.tone} style={styles.countCell}>
                  <Text style={[styles.countValue, { color: s.color }]}>{counts[s.tone]}</Text>
                  <Text style={styles.countLabel}>{s.title}</Text>
                </View>
              ))}
            </View>
          </Card>

          {SECTIONS.map((s) => {
            const items = basket.items.filter((i) => i.tone === s.tone);
            if (items.length === 0) return null;
            return (
              <View key={s.tone} style={styles.section}>
                <View style={styles.sectionHead}>
                  <Ionicons name={s.icon} size={16} color={s.color} />
                  <Text style={[styles.sectionTitle, { color: s.color }]}>
                    {s.title} · {items.length}
                  </Text>
                </View>
                <Card padded={false}>
                  {items.map((item, i) => (
                    <Row key={item.code} item={item} last={i === items.length - 1} />
                  ))}
                </Card>
              </View>
            );
          })}

          <View style={styles.actions}>
            <Button label="Share" icon="share-outline" variant="secondary" onPress={share} style={styles.flex} />
            <Button label="Finish basket" icon="checkmark-done" onPress={finish} style={styles.flex} />
          </View>
          <Text style={styles.note}>Removing an item only takes it off this list. Your scans stay in History.</Text>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  total: {
    ...typography.title,
    color: colors.text,
  },
  countsRow: {
    flexDirection: "row",
    marginTop: spacing.md,
  },
  countCell: {
    flex: 1,
    alignItems: "center",
  },
  countValue: {
    ...typography.stat,
  },
  countLabel: {
    ...typography.overline,
    color: colors.subtext,
    marginTop: 2,
  },
  section: {
    gap: spacing.sm,
  },
  sectionHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginLeft: spacing.xs,
  },
  sectionTitle: {
    ...typography.overline,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingLeft: spacing.lg,
    paddingRight: spacing.sm,
    minHeight: 56,
  },
  divider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  rowMain: {
    flex: 1,
  },
  rowTitle: {
    ...typography.bodyStrong,
    color: colors.text,
  },
  rowSub: {
    ...typography.caption,
    color: colors.subtext,
    marginTop: 2,
  },
  remove: {
    width: layout.touch,
    height: layout.touch,
    alignItems: "center",
    justifyContent: "center",
  },
  actions: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  note: {
    ...typography.caption,
    color: colors.muted,
    textAlign: "center",
  },
});
