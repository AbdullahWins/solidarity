import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Pressable, StyleSheet, TextInput, View } from "react-native";

import { colors, layout, radius, spacing } from "../../constants/theme";

type Props = {
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
};

export function SearchField({ value, onChangeText, placeholder = "Search…", autoFocus }: Props) {
  return (
    <View style={styles.wrap}>
      <Ionicons name="search" size={17} color={colors.subtext} />
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="search"
        autoFocus={autoFocus}
        keyboardAppearance="dark"
        accessibilityLabel={placeholder}
        clearButtonMode="never"
      />
      {value.length > 0 && (
        <Pressable
          onPress={() => onChangeText("")}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Clear search"
        >
          <Ionicons name="close-circle" size={18} color={colors.subtext} />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.panel,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderStrong,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md + 2,
    height: layout.touch,
  },
  input: {
    flex: 1,
    color: colors.text,
    fontSize: 15,
    height: "100%",
    padding: 0,
  },
});
