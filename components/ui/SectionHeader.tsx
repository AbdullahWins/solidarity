import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors, spacing, typography } from "../../constants/theme";

type Props = {
  title: string;
  caption?: string;
  actionLabel?: string;
  onAction?: () => void;
};

export function SectionHeader({ title, caption, actionLabel, onAction }: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.text}>
        <Text style={styles.title} accessibilityRole="header">
          {title}
        </Text>
        {caption ? <Text style={styles.caption}>{caption}</Text> : null}
      </View>
      {actionLabel && onAction ? (
        <Pressable onPress={onAction} hitSlop={10} accessibilityRole="button">
          <Text style={styles.action}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: spacing.md,
    gap: spacing.md,
  },
  text: {
    flex: 1,
  },
  title: {
    ...typography.heading,
    color: colors.text,
  },
  caption: {
    ...typography.caption,
    color: colors.muted,
    marginTop: 2,
  },
  action: {
    ...typography.caption,
    color: colors.accent,
    fontWeight: "700",
  },
});
