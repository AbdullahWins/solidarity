import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Pressable, StyleSheet, Switch, Text, View } from "react-native";

import { colors, layout, radius, spacing, typography } from "../../constants/theme";

type IconName = React.ComponentProps<typeof Ionicons>["name"];

type Props = {
  icon: IconName;
  iconColor?: string;
  label: string;
  subtitle?: string;
  onPress?: () => void;
  /** Renders a switch on the right instead of a chevron. */
  toggle?: { value: boolean; onChange: (v: boolean) => void; disabled?: boolean };
  /** "external" shows an arrow-out icon for links that leave the app. */
  trailing?: "chevron" | "external" | "none";
  destructive?: boolean;
  last?: boolean;
};

/** iOS-style grouped settings row. Put several inside a <Card padded={false}>. */
export function ListRow({
  icon,
  iconColor = colors.accent,
  label,
  subtitle,
  onPress,
  toggle,
  trailing = "chevron",
  destructive,
  last,
}: Props) {
  const tint = destructive ? colors.negative : iconColor;
  const body = (
    <>
      <View style={[styles.icon, { backgroundColor: `${tint}22` }]}>
        <Ionicons name={icon} size={17} color={tint} />
      </View>
      <View style={[styles.textWrap, !last && styles.divider]}>
        <View style={styles.text}>
          <Text style={[styles.label, destructive && { color: colors.negative }]}>{label}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
        {toggle ? (
          <Switch
            value={toggle.value}
            onValueChange={toggle.onChange}
            disabled={toggle.disabled}
            trackColor={{ false: colors.panelStrong, true: colors.accentStrong }}
            thumbColor="#FFFFFF"
            ios_backgroundColor={colors.panelStrong}
            accessibilityLabel={label}
          />
        ) : trailing !== "none" ? (
          <Ionicons
            name={trailing === "external" ? "open-outline" : "chevron-forward"}
            size={17}
            color={colors.muted}
          />
        ) : null}
      </View>
    </>
  );

  if (toggle || !onPress) {
    return <View style={styles.row}>{body}</View>;
  }
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole={trailing === "external" ? "link" : "button"}
      accessibilityLabel={label}
      accessibilityHint={subtitle}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      {body}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: spacing.lg,
    minHeight: layout.touch + 12,
  },
  pressed: {
    backgroundColor: colors.panel,
  },
  icon: {
    width: 32,
    height: 32,
    borderRadius: radius.sm + 1,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.md,
  },
  textWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "stretch",
    paddingVertical: spacing.md,
    paddingRight: spacing.lg,
    gap: spacing.md,
  },
  divider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  text: {
    flex: 1,
  },
  label: {
    ...typography.body,
    color: colors.text,
    fontWeight: "600",
  },
  subtitle: {
    ...typography.caption,
    color: colors.subtext,
    fontWeight: "500",
    marginTop: 2,
  },
});
