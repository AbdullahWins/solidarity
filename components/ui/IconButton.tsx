import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, type StyleProp, type ViewStyle } from "react-native";

import { colors, layout, radius } from "../../constants/theme";
import { PressableScale } from "./PressableScale";

type Props = {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  onPress: () => void;
  accessibilityLabel: string;
  active?: boolean;
  tint?: string;
  style?: StyleProp<ViewStyle>;
  size?: number;
};

export function IconButton({ icon, onPress, accessibilityLabel, active, tint, style, size = layout.touch }: Props) {
  return (
    <PressableScale
      onPress={onPress}
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ selected: !!active }}
      hitSlop={6}
      style={[
        styles.base,
        { width: size, height: size },
        active && styles.active,
        style,
      ]}
      pressedScale={0.92}
    >
      <Ionicons name={icon} size={Math.round(size * 0.45)} color={tint ?? (active ? colors.accent : colors.text)} />
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.pill,
    backgroundColor: colors.panel,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderStrong,
    alignItems: "center",
    justifyContent: "center",
  },
  active: {
    backgroundColor: "rgba(142, 166, 255, 0.16)",
    borderColor: "rgba(142, 166, 255, 0.5)",
  },
});
