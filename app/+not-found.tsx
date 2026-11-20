import { router, Stack } from "expo-router";
import { StyleSheet, View } from "react-native";

import { EmptyState } from "@/components/ui/EmptyState";
import { colors, spacing } from "@/constants/theme";

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: "Not found" }} />
      <View style={styles.container}>
        <EmptyState
          icon="compass-outline"
          title="This page doesn't exist"
          text="The link you followed may be broken or out of date."
          actionLabel="Go to Scan"
          onAction={() => router.replace("/")}
        />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    justifyContent: "center",
    padding: spacing.xl,
  },
});
