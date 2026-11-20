import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { StyleSheet, Text } from "react-native";

const PALETTES: readonly (readonly [string, string])[] = [
  ["#F47A4E", "#D9493A"],
  ["#8EA6FF", "#5B6EE8"],
  ["#4ADE9B", "#16A36B"],
  ["#FBBF24", "#E08A0B"],
  ["#C4B5FD", "#8B6CF0"],
  ["#7DD3FC", "#2B9AD6"],
];

const hash = (s: string) => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
};

export const initialsOf = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("") || "?";

/** Initials on a gradient chosen deterministically from a stable seed (uid). */
export function Avatar({ name, seed, size = 40 }: { name: string; seed: string; size?: number }) {
  const palette = PALETTES[hash(seed) % PALETTES.length];
  return (
    <LinearGradient
      colors={palette}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.base, { width: size, height: size, borderRadius: size / 2 }]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Text style={[styles.text, { fontSize: size * 0.38 }]}>{initialsOf(name)}</Text>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: "center",
    justifyContent: "center",
  },
  text: {
    color: "#FFFFFF",
    fontWeight: "800",
  },
});
