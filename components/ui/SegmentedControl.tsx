import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { colors, radius, spacing, typography } from "../../constants/theme";

type Segment = {
  key: string;
  label: string;
};

type Props = {
  segments: Segment[];
  value: string;
  onChange: (key: string) => void;
};

export function SegmentedControl({ segments, value, onChange }: Props) {
  return (
    <View style={styles.track}>
      {segments.map((segment) => {
        const active = segment.key === value;
        return (
          <TouchableOpacity
            key={segment.key}
            style={[styles.segment, active && styles.segmentActive]}
            onPress={() => onChange(segment.key)}
            activeOpacity={0.8}
          >
            <Text
              style={[styles.label, active && styles.labelActive]}
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              {segment.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: "row",
    height: 40,
    backgroundColor: colors.panelSoft,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    padding: 4,
  },
  segment: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.pill,
    paddingHorizontal: spacing.xs,
  },
  segmentActive: {
    backgroundColor: colors.panelStrong,
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
