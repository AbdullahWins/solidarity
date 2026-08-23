import React from "react";
import { StyleSheet, View, ViewStyle } from "react-native";
import { SafeAreaView, type Edge } from "react-native-safe-area-context";

import { colors } from "../../constants/theme";

type Props = {
  children: React.ReactNode;
  edges?: Edge[];
  style?: ViewStyle;
};

export function ScreenContainer({ children, edges = ["left", "right"], style }: Props) {
  return (
    <SafeAreaView style={styles.safeArea} edges={edges}>
      <View style={[styles.content, style]}>{children}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    flex: 1,
  },
});
