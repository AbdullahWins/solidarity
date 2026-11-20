import React, { useEffect } from "react";
import { View } from "react-native";
import Animated, { Easing, useAnimatedProps, useSharedValue, withTiming } from "react-native-reanimated";
import Svg, { Circle, Defs, LinearGradient, Stop } from "react-native-svg";

import { colors } from "../../constants/theme";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

type Props = {
  size: number;
  stroke?: number;
  progress: number; // 0..1
  from?: string;
  to?: string;
  children?: React.ReactNode;
};

/** Circular progress (e.g. XP around the avatar) with a gradient arc. */
export function ProgressRing({ size, stroke = 5, progress, from = colors.goldStrong, to = colors.gold, children }: Props) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const value = useSharedValue(0);

  useEffect(() => {
    value.set(withTiming(Math.max(0, Math.min(1, progress)), { duration: 900, easing: Easing.out(Easing.cubic) }));
  }, [progress, value]);

  const animatedProps = useAnimatedProps(() => ({ strokeDashoffset: c * (1 - value.get()) }));

  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <Svg width={size} height={size} style={{ position: "absolute", transform: [{ rotate: "-90deg" }] }}>
        <Defs>
          <LinearGradient id="ring" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={from} />
            <Stop offset="1" stopColor={to} />
          </LinearGradient>
        </Defs>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={colors.panelStrong} strokeWidth={stroke} fill="none" />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="url(#ring)"
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={`${c} ${c}`}
          animatedProps={animatedProps}
        />
      </Svg>
      {children}
    </View>
  );
}
