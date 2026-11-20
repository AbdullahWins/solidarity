import { BlurView } from "expo-blur";
import { Image } from "expo-image";
import type { BottomTabBarProps } from "expo-router/js-tabs";
import React from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { useAnimatedStyle, withSpring, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors, layout, radius, spacing } from "../../constants/theme";
import { useLayout } from "../../hooks/useLayout";

export const BOTTOM_BAR_HEIGHT = 64;
export const BOTTOM_BAR_MARGIN = 10;
export const RAIL_WIDTH = 88;

/** Space a scrolling screen must leave below its content for the floating bar. */
export function useBottomBarSpace(): number {
  const insets = useSafeAreaInsets();
  const { useRail } = useLayout();
  return useRail ? insets.bottom : BOTTOM_BAR_HEIGHT + BOTTOM_BAR_MARGIN + Math.max(insets.bottom, spacing.sm);
}

const logo = require("../../assets/images/logo.png");

function TabItem({
  label,
  icon,
  focused,
  rail,
  compact,
  onPress,
  onLongPress,
  accessibilityLabel,
}: {
  label: string;
  icon: React.ReactNode;
  focused: boolean;
  rail: boolean;
  compact?: boolean;
  onPress: () => void;
  onLongPress: () => void;
  accessibilityLabel?: string;
}) {
  const pill = useAnimatedStyle(() => ({
    opacity: withTiming(focused ? 1 : 0, { duration: 180 }),
    transform: [{ scale: withSpring(focused ? 1 : 0.6, { damping: 16, stiffness: 260 }) }],
  }));

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      accessibilityRole="tab"
      accessibilityState={{ selected: focused }}
      accessibilityLabel={accessibilityLabel ?? label}
      style={rail ? [styles.railItem, compact && styles.railItemCompact] : styles.barItem}
      hitSlop={4}
    >
      <View style={styles.iconWrap}>
        <Animated.View style={[styles.pill, pill]} />
        {icon}
      </View>
      {compact ? null : (
        <Text
          numberOfLines={1}
          style={[styles.label, rail && styles.railLabel, { color: focused ? colors.text : colors.muted }]}
          maxFontSizeMultiplier={1.3}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
}

export function AdaptiveTabBar({ state, descriptors, emitter, navigateToTab }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { useRail, height } = useLayout();
  // Phone landscape: ~360-430dp tall. Six labelled items plus the logo don't
  // fit, so drop the logo and labels (accessibility labels remain).
  const compactRail = useRail && height < 520;

  const items = state.routes.map((route, index) => {
    const { options } = descriptors[route.key];
    const focused = index === state.index;
    const color = focused ? colors.accent : colors.muted;
    const label = typeof options.tabBarLabel === "string" ? options.tabBarLabel : (options.title ?? route.name);
    const onPress = () => {
      const event = emitter.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
      if (!focused && !event.defaultPrevented) navigateToTab(route.key);
    };
    const onLongPress = () => emitter.emit({ type: "tabLongPress", target: route.key });
    return (
      <TabItem
        key={route.key}
        label={label}
        focused={focused}
        rail={useRail}
        compact={compactRail}
        onPress={onPress}
        onLongPress={onLongPress}
        accessibilityLabel={options.tabBarAccessibilityLabel}
        icon={options.tabBarIcon?.({ focused, color, size: 22 })}
      />
    );
  });

  if (useRail) {
    return (
      <View
        style={[
          styles.rail,
          {
            paddingTop: insets.top + (compactRail ? spacing.sm : spacing.lg),
            paddingBottom: insets.bottom + (compactRail ? spacing.sm : spacing.lg),
            paddingLeft: insets.left,
          },
        ]}
      >
        {compactRail ? null : (
          <Image source={logo} style={styles.railLogo} contentFit="contain" accessibilityLabel="Solidarity" />
        )}
        <View style={styles.railItems}>{items}</View>
      </View>
    );
  }

  const Background = Platform.OS === "ios" ? (
    <BlurView tint="systemChromeMaterialDark" intensity={60} style={StyleSheet.absoluteFill} />
  ) : null;

  return (
    <View
      pointerEvents="box-none"
      style={[
        styles.barHost,
        {
          bottom: Math.max(insets.bottom, spacing.sm),
          left: insets.left + spacing.lg,
          right: insets.right + spacing.lg,
        },
      ]}
    >
      <View style={styles.bar}>
        {Background}
        {items}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  barHost: {
    position: "absolute",
    alignItems: "center",
  },
  bar: {
    width: "100%",
    maxWidth: 560,
    height: BOTTOM_BAR_HEIGHT,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.xs,
    borderRadius: radius.xxl,
    overflow: "hidden",
    backgroundColor: Platform.OS === "ios" ? "rgba(18, 21, 28, 0.72)" : "rgba(18, 21, 28, 0.97)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderStrong,
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOpacity: 0.5, shadowRadius: 20, shadowOffset: { width: 0, height: 10 } },
      default: { elevation: 12 },
    }),
  },
  barItem: {
    flex: 1,
    height: "100%",
    minWidth: layout.touch,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  rail: {
    width: RAIL_WIDTH,
    backgroundColor: colors.bgElevated,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: colors.border,
    alignItems: "center",
  },
  railLogo: {
    width: 40,
    height: 40,
    borderRadius: 12,
    marginBottom: spacing.xl,
  },
  railItems: {
    flex: 1,
    width: "100%",
    justifyContent: "center",
    gap: spacing.xs,
  },
  railItem: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.sm,
    minHeight: 60,
    gap: 4,
  },
  railItemCompact: {
    minHeight: 48,
    paddingVertical: 4,
  },
  iconWrap: {
    width: 52,
    height: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  pill: {
    ...StyleSheet.absoluteFill,
    borderRadius: radius.pill,
    backgroundColor: "rgba(142, 166, 255, 0.16)",
  },
  label: {
    fontSize: 10.5,
    fontWeight: "700",
    letterSpacing: 0.1,
  },
  railLabel: {
    fontSize: 11,
  },
});
