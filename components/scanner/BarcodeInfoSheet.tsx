import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { colors, radius, spacing, typography } from "../../constants/theme";
import { openInAppBrowser } from "../../lib/links";
import { Button } from "../ui/Button";

const GS1_PREFIX_URL = "https://www.gs1.org/standards/id-keys/company-prefix";

const POINTS: { icon: React.ComponentProps<typeof Ionicons>["name"]; title: string; text: string }[] = [
  {
    icon: "barcode-outline",
    title: "The first digits are a GS1 prefix",
    text: "They name the national GS1 office where the company registered its barcodes.",
  },
  {
    icon: "business-outline",
    title: "Registered, not made",
    text: "Companies usually register where their head office is. The product can be made in another country, and the brand can be owned by a company from somewhere else.",
  },
  {
    icon: "bulb-outline",
    title: "For example",
    text: "A chocolate bar made in Poland by a German company can carry a 400–440 (Germany) prefix.",
  },
];

/** Plain explanation of what a barcode prefix does and doesn't tell you. */
export function BarcodeInfoSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Close">
        <Pressable style={styles.sheet} onPress={() => {}} accessibilityViewIsModal>
          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            <Text style={styles.title} accessibilityRole="header">
              What this barcode tells you
            </Text>
            {POINTS.map((p) => (
              <View key={p.title} style={styles.point}>
                <View style={styles.icon}>
                  <Ionicons name={p.icon} size={18} color={colors.accent} />
                </View>
                <View style={styles.flex}>
                  <Text style={styles.pointTitle}>{p.title}</Text>
                  <Text style={styles.pointText}>{p.text}</Text>
                </View>
              </View>
            ))}
            <Text style={styles.note}>
              So treat the verdict as a guide to where a product&apos;s barcode comes from, and check the label when it
              matters to you.
            </Text>
            <Button label="GS1 explains prefixes" icon="open-outline" variant="secondary" onPress={() => void openInAppBrowser(GS1_PREFIX_URL)} />
            <Button label="Got it" onPress={onClose} />
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  backdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
  },
  sheet: {
    width: "100%",
    maxWidth: 460,
    maxHeight: "90%",
    backgroundColor: colors.bgElevated,
    borderRadius: radius.xxl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderStrong,
  },
  content: {
    padding: spacing.xl,
    gap: spacing.lg,
  },
  title: {
    ...typography.title,
    color: colors.text,
  },
  point: {
    flexDirection: "row",
    gap: spacing.md,
  },
  icon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "rgba(142, 166, 255, 0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  pointTitle: {
    ...typography.bodyStrong,
    color: colors.text,
  },
  pointText: {
    ...typography.body,
    color: colors.subtext,
    marginTop: 2,
  },
  note: {
    ...typography.caption,
    color: colors.muted,
  },
});
