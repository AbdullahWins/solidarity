import React from "react";
import { StyleSheet, Text, View } from "react-native";
import Svg, { Circle } from "react-native-svg";

import { colors, typography } from "../../constants/theme";

type Segment = { value: number; color: string };

type Props = {
  size?: number;
  stroke?: number;
  segments: Segment[];
  label: string;
  caption?: string;
};

/** Ring chart with a centred label. Empty data renders a neutral track. */
export function Donut({ size = 132, stroke = 14, segments, label, caption }: Props) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const total = segments.reduce((s, x) => s + x.value, 0);
  const gap = total > 0 && segments.filter((s) => s.value > 0).length > 1 ? 4 : 0;

  let offset = 0;
  const arcs = segments
    .filter((s) => s.value > 0)
    .map((s, i) => {
      const len = (s.value / total) * c;
      const arc = (
        <Circle
          key={i}
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={s.color}
          strokeWidth={stroke}
          strokeLinecap={gap ? "round" : "butt"}
          fill="none"
          strokeDasharray={`${Math.max(len - gap - (gap ? stroke : 0), 0.01)} ${c}`}
          strokeDashoffset={-offset - (gap ? stroke / 2 : 0)}
        />
      );
      offset += len;
      return arc;
    });

  return (
    <View style={{ width: size, height: size }} accessible accessibilityLabel={`${label} ${caption ?? ""}`}>
      <Svg width={size} height={size} style={{ transform: [{ rotate: "-90deg" }] }}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={colors.panelStrong} strokeWidth={stroke} fill="none" />
        {total > 0 ? arcs : null}
      </Svg>
      <View style={styles.center} pointerEvents="none">
        <Text style={styles.label}>{label}</Text>
        {caption ? <Text style={styles.caption}>{caption}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    ...typography.stat,
    color: colors.text,
  },
  caption: {
    ...typography.caption,
    color: colors.muted,
    fontSize: 11,
  },
});
