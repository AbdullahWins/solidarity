import { Ionicons } from "@expo/vector-icons";
import React, { memo } from "react";
import { StyleSheet, View } from "react-native";
import { SvgXml } from "react-native-svg";

import { COUNTRY_ISO } from "../../constants/country-iso";
import { FLAG_SVGS } from "../../constants/flags";
import { colors } from "../../constants/theme";

type IconName = React.ComponentProps<typeof Ionicons>["name"];

/** Glyphs for GS1 ranges that aren't countries. */
const GLYPHS: Record<string, IconName> = {
  "bookland (isbn)": "book-outline",
  "serial publications (issn)": "newspaper-outline",
  coupons: "pricetag-outline",
  "coupon identification": "pricetag-outline",
  "refund receipts": "receipt-outline",
  "usa drugs": "medkit-outline",
  reserved: "storefront-outline",
  epc: "radio-outline",
  "gs1 global office": "globe-outline",
};

export function flagSvgFor(country: string): string | null {
  const iso = COUNTRY_ISO[country];
  return iso ? (FLAG_SVGS[iso] ?? null) : null;
}

type Props = {
  country: string;
  /** Height in dp; width is 1.5×. */
  size?: number;
  /** Round "coin" shape instead of the 3:2 rectangle. */
  round?: boolean;
};

/** Country flag (3:2 SVG) or a neutral glyph for non-country ranges. */
export const Flag = memo(function Flag({ country, size = 20, round }: Props) {
  const svg = flagSvgFor(country);
  const width = round ? size : Math.round(size * 1.5);
  const radius = round ? size / 2 : Math.max(3, size * 0.18);

  if (!svg) {
    const glyph = GLYPHS[country.toLowerCase()] ?? "help-circle-outline";
    return (
      <View
        style={[styles.frame, styles.glyph, { width, height: size, borderRadius: radius }]}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <Ionicons name={glyph} size={Math.round(size * 0.62)} color={colors.subtext} />
      </View>
    );
  }

  return (
    <View
      style={[styles.frame, { width, height: size, borderRadius: radius }]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <SvgXml
        xml={svg}
        width={round ? size * 1.5 : width}
        height={size}
        preserveAspectRatio="xMidYMid slice"
        style={round ? { marginLeft: -size * 0.25 } : undefined}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  frame: {
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255, 255, 255, 0.18)",
    backgroundColor: colors.surfaceHigh,
  },
  glyph: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.panelStrong,
  },
});
