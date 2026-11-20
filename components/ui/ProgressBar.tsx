import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withTiming, Easing } from "react-native-reanimated";

import { colors, radius } from "../../constants/theme";

type Props = {
  progress: number; // 0..1
  colors?: readonly [string, string, ...string[]];
  height?: number;
  accessibilityLabel?: string;
};

export function ProgressBar({
  progress,
  colors: fill = [colors.goldStrong, colors.gold],
  height = 10,
  accessibilityLabel = "Progress",
}: Props) {
  const clamped = Math.max(0, Math.min(1, progress));
  const value = useSharedValue(0);

  useEffect(() => {
    value.value = withTiming(clamped, { duration: 700, easing: Easing.out(Easing.cubic) });
  }, [clamped, value]);

  const animated = useAnimatedStyle(() => ({ width: `${value.value * 100}%` }));

  return (
    <View
      style={[styles.track, { height, borderRadius: height }]}
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(clamped * 100) }}
    >
      <Animated.View style={[styles.fill, animated, { borderRadius: height }]}>
        <LinearGradient colors={fill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    width: "100%",
    backgroundColor: colors.panelStrong,
    overflow: "hidden",
    borderRadius: radius.pill,
  },
  fill: {
    height: "100%",
    overflow: "hidden",
  },
});
