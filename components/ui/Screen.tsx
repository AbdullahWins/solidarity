import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type ScrollViewProps,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors, layout, spacing, typography } from "../../constants/theme";
import { useLayout } from "../../hooks/useLayout";
import { useBottomBarSpace } from "../navigation/AdaptiveTabBar";

type Width = "readable" | "wide" | "full";

export type ScreenInsets = { paddingTop: number; paddingBottom: number; paddingLeft: number; paddingRight: number };

/**
 * Padding for a screen's scroll content: safe areas on every edge (landscape
 * notches included), room for the floating tab bar, and the page gutter.
 * Exposed so FlatList-based screens can apply the same insets.
 */
export function useScreenInsets(inTabs = true): ScreenInsets {
  const insets = useSafeAreaInsets();
  const { useRail, gutter } = useLayout();
  const barSpace = useBottomBarSpace();
  return {
    paddingTop: (inTabs ? insets.top : 0) + spacing.md,
    paddingBottom: (inTabs ? barSpace : insets.bottom) + spacing.xl,
    // The rail already sits under the left inset.
    paddingLeft: (inTabs && useRail ? 0 : insets.left) + gutter,
    paddingRight: insets.right + gutter,
  };
}

export function maxWidthFor(width: Width): number | undefined {
  return width === "readable" ? layout.readable : width === "wide" ? layout.wide : undefined;
}

type HeaderProps = {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  overline?: string;
};

export function ScreenHeader({ title, subtitle, right, overline }: HeaderProps) {
  return (
    <Animated.View entering={FadeInDown.duration(380)} style={styles.header}>
      <View style={styles.headerText}>
        {overline ? <Text style={styles.overline}>{overline}</Text> : null}
        <Text style={styles.title} accessibilityRole="header" maxFontSizeMultiplier={1.4}>
          {title}
        </Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {right ? <View style={styles.headerRight}>{right}</View> : null}
    </Animated.View>
  );
}

type Props = {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  overline?: string;
  headerRight?: React.ReactNode;
  /** false for screens that render their own FlatList. */
  scroll?: boolean;
  width?: Width;
  inTabs?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  contentStyle?: StyleProp<ViewStyle>;
  keyboardShouldPersistTaps?: ScrollViewProps["keyboardShouldPersistTaps"];
};

/** Full-bleed dark background with a soft brand glow behind the header. */
export function ScreenBackground() {
  return (
    <LinearGradient
      pointerEvents="none"
      colors={["rgba(240, 100, 60, 0.10)", "rgba(109, 136, 250, 0.05)", "rgba(7, 8, 11, 0)"]}
      locations={[0, 0.35, 1]}
      style={styles.glow}
    />
  );
}

export function Screen({
  children,
  title,
  subtitle,
  overline,
  headerRight,
  scroll = true,
  width = "readable",
  inTabs = true,
  refreshing,
  onRefresh,
  contentStyle,
  keyboardShouldPersistTaps = "handled",
}: Props) {
  const pad = useScreenInsets(inTabs);
  const maxWidth = maxWidthFor(width);

  const header = title ? (
    <ScreenHeader title={title} subtitle={subtitle} right={headerRight} overline={overline} />
  ) : null;

  if (!scroll) {
    return (
      <View style={styles.root}>
        <ScreenBackground />
        {children}
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <ScreenBackground />
      <ScrollView
        contentContainerStyle={[pad, styles.scrollContent]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps={keyboardShouldPersistTaps}
        keyboardDismissMode="on-drag"
        contentInsetAdjustmentBehavior="never"
        refreshControl={
          onRefresh ? (
            <RefreshControl
              refreshing={!!refreshing}
              onRefresh={onRefresh}
              tintColor={colors.text}
              colors={[colors.accentStrong]}
              progressBackgroundColor={colors.surfaceHigh}
              progressViewOffset={pad.paddingTop}
            />
          ) : undefined
        }
      >
        <View style={[styles.column, { maxWidth }, contentStyle]}>
          {header}
          {children}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  glow: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 360,
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: "center",
  },
  column: {
    width: "100%",
    gap: spacing.lg,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: spacing.md,
    marginBottom: spacing.xs,
  },
  headerText: {
    flex: 1,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  overline: {
    ...typography.overline,
    color: colors.brandSoft,
    marginBottom: spacing.xs,
  },
  title: {
    ...typography.display,
    color: colors.text,
  },
  subtitle: {
    ...typography.body,
    color: colors.subtext,
    marginTop: spacing.xs,
  },
});
