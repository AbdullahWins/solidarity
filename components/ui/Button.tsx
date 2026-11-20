import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { ActivityIndicator, StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";

import { colors, gradients, layout, radius, shadow, spacing, typography } from "../../constants/theme";
import { PressableScale } from "./PressableScale";

type Variant = "primary" | "brand" | "secondary" | "ghost" | "danger";

type Props = {
  label: string;
  onPress: () => void;
  variant?: Variant;
  icon?: React.ComponentProps<typeof Ionicons>["name"];
  size?: "md" | "lg";
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityHint?: string;
};

export function Button({
  label,
  onPress,
  variant = "primary",
  icon,
  size = "md",
  disabled,
  loading,
  style,
  accessibilityHint,
}: Props) {
  const filled = variant === "primary" || variant === "brand";
  const fg =
    filled ? colors.onAccent : variant === "danger" ? colors.negative : variant === "ghost" ? colors.accent : colors.text;

  const content = (
    <View style={[styles.inner, size === "lg" && styles.innerLg]}>
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <>
          {icon ? <Ionicons name={icon} size={18} color={fg} /> : null}
          <Text style={[styles.label, { color: fg }]} numberOfLines={1}>
            {label}
          </Text>
        </>
      )}
    </View>
  );

  return (
    <PressableScale
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: !!(disabled || loading), busy: !!loading }}
      style={[
        styles.base,
        variant === "secondary" && styles.secondary,
        variant === "danger" && styles.danger,
        filled && shadow.glow(variant === "brand" ? colors.brand : colors.accentStrong),
        style,
      ]}
    >
      {filled ? (
        <LinearGradient
          colors={variant === "brand" ? gradients.brand : gradients.accent}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradient}
        >
          {content}
        </LinearGradient>
      ) : (
        content
      )}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.lg,
    minHeight: layout.touch + 4,
  },
  gradient: {
    borderRadius: radius.lg,
  },
  inner: {
    minHeight: layout.touch + 4,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
  },
  innerLg: {
    minHeight: 56,
  },
  secondary: {
    backgroundColor: colors.panelStrong,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderStrong,
  },
  danger: {
    backgroundColor: "rgba(251, 113, 133, 0.10)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(251, 113, 133, 0.35)",
  },
  label: {
    ...typography.bodyStrong,
  },
});
