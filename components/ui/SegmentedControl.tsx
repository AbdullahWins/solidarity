import React, { useState } from "react";
import { Pressable, StyleSheet, Text, View, type LayoutChangeEvent } from "react-native";
import Animated, { useAnimatedStyle, withSpring } from "react-native-reanimated";

import { colors, layout, radius, typography } from "../../constants/theme";
import { hapticSelection } from "../../lib/haptics";

type Segment = { key: string; label: string };

type Props = {
  segments: Segment[];
  value: string;
  onChange: (key: string) => void;
};

const PAD = 4;

export function SegmentedControl({ segments, value, onChange }: Props) {
  const [width, setWidth] = useState(0);
  const index = Math.max(0, segments.findIndex((s) => s.key === value));
  const segWidth = segments.length ? (width - PAD * 2) / segments.length : 0;

  const thumb = useAnimatedStyle(() => ({
    width: segWidth,
    transform: [{ translateX: withSpring(index * segWidth, { damping: 20, stiffness: 240 }) }],
  }));

  return (
    <View
      style={styles.track}
      onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}
      accessibilityRole="tablist"
    >
      {width > 0 ? <Animated.View style={[styles.thumb, thumb]} /> : null}
      {segments.map((segment) => {
        const active = segment.key === value;
        return (
          <Pressable
            key={segment.key}
            style={styles.segment}
            onPress={() => {
              if (!active) {
                hapticSelection();
                onChange(segment.key);
              }
            }}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            accessibilityLabel={segment.label}
          >
            <Text style={[styles.label, active && styles.labelActive]} numberOfLines={1} maxFontSizeMultiplier={1.3}>
              {segment.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: "row",
    height: layout.touch,
    backgroundColor: colors.panel,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: radius.pill,
    padding: PAD,
  },
  thumb: {
    position: "absolute",
    top: PAD,
    bottom: PAD,
    left: PAD,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceHigh,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderStrong,
  },
  segment: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  label: {
    ...typography.caption,
    color: colors.subtext,
    fontWeight: "700",
  },
  labelActive: {
    color: colors.text,
  },
});
