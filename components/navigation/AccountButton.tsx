import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { colors, layout } from "../../constants/theme";
import { useAuth } from "../../contexts/AuthContext";
import { Avatar } from "../ui/Avatar";

/** Header entry point to Profile (and Settings from there) on every tab. */
export function AccountButton() {
  const { user } = useAuth();
  return (
    <Pressable
      onPress={() => router.push("/profile")}
      style={({ pressed }) => [styles.hit, pressed && { opacity: 0.7 }]}
      accessibilityRole="button"
      accessibilityLabel="Profile and settings"
      hitSlop={6}
    >
      {user ? (
        <Avatar name={user.displayName || user.email || "S"} seed={user.uid} size={34} />
      ) : (
        <View style={styles.guest}>
          <Ionicons name="person" size={18} color={colors.subtext} />
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hit: {
    minWidth: layout.touch,
    minHeight: layout.touch,
    alignItems: "center",
    justifyContent: "center",
  },
  guest: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.panelStrong,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
});
