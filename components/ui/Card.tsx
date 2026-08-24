import React from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

import { colors, radius, shadow, spacing } from "../../constants/theme";

type Props = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  tone?: "default" | "positive" | "negative";
  elevated?: boolean;
};

export function Card({ children, style, tone = "default", elevated = false }: Props) {
  return (
    <View
      style={[
        styles.base,
        tone === "positive" && styles.positive,
        tone === "negative" && styles.negative,
        elevated && shadow.card,
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  positive: {
    borderColor: `${colors.positive}88`,
  },
  negative: {
    borderColor: `${colors.negative}88`,
  },
});
