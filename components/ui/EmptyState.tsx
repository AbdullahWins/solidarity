import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { colors, radius, spacing, typography } from "../../constants/theme";
import { Button } from "./Button";

type Props = {
  text: string;
  title?: string;
  icon?: React.ComponentProps<typeof Ionicons>["name"];
  actionLabel?: string;
  onAction?: () => void;
};

export function EmptyState({ text, title, icon = "sparkles-outline", actionLabel, onAction }: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.iconWrap}>
        <Ionicons name={icon} size={26} color={colors.accent} />
      </View>
      {title ? <Text style={styles.title}>{title}</Text> : null}
      <Text style={styles.text}>{text}</Text>
      {actionLabel && onAction ? (
        <Button label={actionLabel} variant="secondary" onPress={onAction} style={styles.action} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    borderRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderStyle: "dashed",
    borderColor: colors.borderStrong,
    backgroundColor: colors.panelSoft,
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
  },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: radius.pill,
    backgroundColor: "rgba(142, 166, 255, 0.12)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xs,
  },
  title: {
    ...typography.heading,
    color: colors.text,
    textAlign: "center",
  },
  text: {
    ...typography.body,
    color: colors.subtext,
    textAlign: "center",
    maxWidth: 420,
  },
  action: {
    marginTop: spacing.sm,
    alignSelf: "center",
  },
});
