import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import React from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import { colors, radius, spacing, typography } from "../../constants/theme";
import type { ProductState } from "../../hooks/useProductLookup";
import { openInAppBrowser } from "../../lib/links";
import { addProductUrl, productPageUrl } from "../../lib/productLookup";
import { Button } from "../ui/Button";

type Props = {
  code: string;
  consent: "unset" | "on" | "off";
  state: ProductState;
  onConsent: (on: boolean) => void;
};

function Link({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="link" hitSlop={8}>
      <Text style={styles.link}>{label}</Text>
    </Pressable>
  );
}

/** Product name, brand and photo from Open Food Facts, with consent and attribution. */
export function ProductRow({ code, consent, state, onConsent }: Props) {
  if (consent === "off") return null;

  if (consent === "unset") {
    return (
      <View style={styles.consent}>
        <View style={styles.consentHead}>
          <Ionicons name="pricetag-outline" size={18} color={colors.accent} />
          <Text style={styles.consentTitle}>Show product names?</Text>
        </View>
        <Text style={styles.consentText}>
          Sends only the barcode to Open Food Facts, a free, open product database. You can change this in Settings.
        </Text>
        <View style={styles.consentButtons}>
          <Button label="No thanks" variant="secondary" onPress={() => onConsent(false)} style={styles.flex} />
          <Button label="Turn on" onPress={() => onConsent(true)} style={styles.flex} />
        </View>
      </View>
    );
  }

  if (state.status === "loading" || state.status === "idle") {
    return (
      <View style={styles.row} accessibilityLabel="Looking up product">
        <ActivityIndicator size="small" color={colors.subtext} />
        <Text style={styles.quiet}>Looking up product…</Text>
      </View>
    );
  }

  if (state.status === "unavailable") {
    return (
      <View style={styles.row}>
        <Ionicons name="cloud-offline-outline" size={16} color={colors.muted} />
        <Text style={styles.quiet}>Product details unavailable</Text>
      </View>
    );
  }

  if (state.status === "not-found") {
    return (
      <View style={styles.row}>
        <Ionicons name="help-circle-outline" size={16} color={colors.muted} />
        <Text style={[styles.quiet, styles.flex]}>Not in Open Food Facts yet.</Text>
        <Link label="Add it" onPress={() => void openInAppBrowser(addProductUrl(code))} />
      </View>
    );
  }

  const { name, brand, image } = state.product;
  return (
    <View style={styles.found}>
      <View style={styles.row}>
        {image ? (
          <Image source={{ uri: image }} style={styles.thumb} contentFit="cover" cachePolicy="disk" accessibilityIgnoresInvertColors />
        ) : (
          <View style={[styles.thumb, styles.thumbEmpty]}>
            <Ionicons name="cube-outline" size={20} color={colors.muted} />
          </View>
        )}
        <View style={styles.flex}>
          <Text style={styles.name} numberOfLines={2}>
            {name ?? brand}
          </Text>
          {name && brand ? (
            <Text style={styles.brand} numberOfLines={1}>
              {brand}
            </Text>
          ) : null}
        </View>
      </View>
      <View style={styles.attribution}>
        <Text style={styles.credit}>Product data: Open Food Facts (ODbL)</Text>
        <Link label="Not the right product?" onPress={() => void openInAppBrowser(productPageUrl(code))} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  quiet: {
    ...typography.caption,
    color: colors.muted,
    fontWeight: "500",
  },
  found: {
    gap: spacing.xs,
  },
  thumb: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: colors.panelStrong,
  },
  thumbEmpty: {
    alignItems: "center",
    justifyContent: "center",
  },
  name: {
    ...typography.bodyStrong,
    color: colors.text,
  },
  brand: {
    ...typography.caption,
    color: colors.subtext,
    marginTop: 2,
  },
  attribution: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  credit: {
    ...typography.caption,
    fontSize: 11,
    color: colors.muted,
  },
  link: {
    ...typography.caption,
    color: colors.accent,
    fontWeight: "700",
  },
  consent: {
    gap: spacing.sm,
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.panel,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  consentHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  consentTitle: {
    ...typography.bodyStrong,
    color: colors.text,
  },
  consentText: {
    ...typography.caption,
    color: colors.subtext,
  },
  consentButtons: {
    flexDirection: "row",
    gap: spacing.sm,
  },
});
