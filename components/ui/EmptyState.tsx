import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { colors, radius, spacing, typography } from "../../constants/theme";

type Props = {
  text: string;
};

export function EmptyState({ text }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.panelSoft,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.md,
  },
  text: {
    ...typography.body,
    color: colors.subtext,
    textAlign: "center",
  },
});
