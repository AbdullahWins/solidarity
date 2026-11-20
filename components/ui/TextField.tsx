import { Ionicons } from "@expo/vector-icons";
import React, { forwardRef, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View, type TextInputProps } from "react-native";

import { colors, layout, radius, spacing, typography } from "../../constants/theme";

type Props = TextInputProps & {
  label?: string;
  icon?: React.ComponentProps<typeof Ionicons>["name"];
  error?: string | null;
  hint?: string;
};

export const TextField = forwardRef<React.ComponentRef<typeof TextInput>, Props>(function TextField(
  { label, icon, error, hint, style, secureTextEntry, onFocus, onBlur, ...rest },
  ref
) {
  const [focused, setFocused] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const isSecret = !!secureTextEntry;

  return (
    <View style={styles.wrap}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View
        style={[
          styles.field,
          focused && styles.fieldFocused,
          !!error && styles.fieldError,
        ]}
      >
        {icon ? <Ionicons name={icon} size={18} color={focused ? colors.accent : colors.muted} /> : null}
        <TextInput
          ref={ref}
          style={[styles.input, style]}
          placeholderTextColor={colors.muted}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardAppearance="dark"
          secureTextEntry={isSecret && !revealed}
          accessibilityLabel={label ?? rest.placeholder}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          {...rest}
        />
        {isSecret ? (
          <Pressable
            onPress={() => setRevealed((v) => !v)}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel={revealed ? "Hide password" : "Show password"}
          >
            <Ionicons name={revealed ? "eye-off-outline" : "eye-outline"} size={19} color={colors.subtext} />
          </Pressable>
        ) : null}
      </View>
      {error ? (
        <Text style={styles.error} accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : hint ? (
        <Text style={styles.hint}>{hint}</Text>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.xs + 2,
  },
  label: {
    ...typography.caption,
    color: colors.subtext,
  },
  field: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    minHeight: layout.touch + 6,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md + 2,
    backgroundColor: colors.panel,
    paddingHorizontal: spacing.md,
  },
  fieldFocused: {
    borderColor: "rgba(142, 166, 255, 0.6)",
    backgroundColor: "rgba(142, 166, 255, 0.06)",
  },
  fieldError: {
    borderColor: "rgba(251, 113, 133, 0.6)",
  },
  input: {
    flex: 1,
    color: colors.text,
    fontSize: 16,
    paddingVertical: spacing.md,
  },
  error: {
    ...typography.caption,
    color: colors.negative,
  },
  hint: {
    ...typography.caption,
    color: colors.muted,
  },
});
