import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

import { colors, gradients, radius, spacing } from "../../constants/theme";

type Tone = "default" | "positive" | "negative" | "gold" | "hero";

type Props = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  tone?: Tone;
  /** Kept for API compatibility; cards are flat by design. */
  elevated?: boolean;
  padded?: boolean;
};

const TONE_GRADIENT: Partial<Record<Tone, readonly [string, string, ...string[]]>> = {
  positive: gradients.positive,
  negative: gradients.negative,
  gold: gradients.gold,
  hero: gradients.hero,
};

const TONE_BORDER: Record<Tone, string> = {
  default: colors.border,
  positive: "rgba(74, 222, 155, 0.30)",
  negative: "rgba(251, 113, 133, 0.30)",
  gold: "rgba(251, 191, 36, 0.28)",
  hero: "rgba(240, 100, 60, 0.28)",
};

export function Card({ children, style, tone = "default", padded = true }: Props) {
  const gradient = TONE_GRADIENT[tone];
  return (
    <View style={[styles.base, { borderColor: TONE_BORDER[tone] }, padded && styles.padded, style]}>
      {gradient ? (
        <LinearGradient
          pointerEvents="none"
          colors={gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      ) : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.xl,
    overflow: "hidden",
  },
  padded: {
    padding: spacing.lg,
  },
});
