import React from "react";
import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type Props = Omit<PressableProps, "style"> & {
  style?: StyleProp<ViewStyle>;
  /** Scale while pressed. */
  pressedScale?: number;
  children?: React.ReactNode;
};

const SPRING = { damping: 18, stiffness: 320, mass: 0.6 };

/** Pressable with a subtle spring scale, used by every tappable surface. */
export function PressableScale({ style, pressedScale = 0.97, onPressIn, onPressOut, disabled, children, ...rest }: Props) {
  const scale = useSharedValue(1);
  const animated = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <AnimatedPressable
      accessibilityRole="button"
      disabled={disabled}
      onPressIn={(e) => {
        scale.set(withSpring(pressedScale, SPRING));
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        scale.set(withSpring(1, SPRING));
        onPressOut?.(e);
      }}
      style={[style, animated, disabled ? { opacity: 0.5 } : null]}
      {...rest}
    >
      {children}
    </AnimatedPressable>
  );
}
