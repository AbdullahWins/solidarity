import { Ionicons } from "@expo/vector-icons";
import { useFonts } from "expo-font";
import { DarkTheme, Stack, ThemeProvider, type ErrorBoundaryProps } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import * as SystemUI from "expo-system-ui";
import { useEffect } from "react";
import { AppState, StyleSheet, Text, View } from "react-native";
import "react-native-reanimated";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { Button } from "@/components/ui/Button";
import { colors, spacing, typography } from "@/constants/theme";
import { AuthProvider } from "@/contexts/AuthContext";
import { scheduleStreakReminders } from "@/lib/notifications";
import { getPreferences } from "@/lib/preferences";
import { getGamificationState } from "@/lib/storage";
import { loadMyVotes } from "@/lib/votes";

void SplashScreen.preventAutoHideAsync().catch(() => {});
SplashScreen.setOptions({ fade: true, duration: 250 });

const navTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: colors.bg,
    card: colors.bgElevated,
    border: colors.border,
    primary: colors.accent,
    text: colors.text,
    notification: colors.brand,
  },
};

/** Keeps the rolling 7-day reminder window fresh whenever the app opens. */
async function refreshReminders() {
  const prefs = await getPreferences();
  if (!prefs.streakReminderEnabled) return;
  const g = await getGamificationState();
  await scheduleStreakReminders(g.lastScanLocalDate).catch(() => {});
}

export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  return (
    <View style={styles.error}>
      <Text style={styles.errorTitle}>Something went wrong</Text>
      <Text style={styles.errorText}>
        {__DEV__ ? error.message : "Solidarity hit an unexpected problem. Your data on this device is safe."}
      </Text>
      <Button label="Try again" icon="refresh" onPress={retry} />
    </View>
  );
}

export default function RootLayout() {
  const [loaded, fontError] = useFonts(Ionicons.font);

  useEffect(() => {
    void SystemUI.setBackgroundColorAsync(colors.bg).catch(() => {});
    void loadMyVotes();
    void refreshReminders();
    const sub = AppState.addEventListener("change", (s) => {
      if (s === "active") void refreshReminders();
    });
    return () => sub.remove();
  }, []);

  const ready = loaded || !!fontError;

  useEffect(() => {
    if (ready) void SplashScreen.hideAsync().catch(() => {});
  }, [ready]);

  if (!ready) return null;

  return (
    <SafeAreaProvider style={{ backgroundColor: colors.bg }}>
      <AuthProvider>
        <ThemeProvider value={navTheme}>
          <Stack
            screenOptions={{
              headerStyle: { backgroundColor: colors.bg },
              headerTintColor: colors.text,
              headerTitleStyle: { fontWeight: "700" },
              headerShadowVisible: false,
              contentStyle: { backgroundColor: colors.bg },
            }}
          >
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen
              name="auth"
              options={{ presentation: "modal", title: "Account", headerShown: false }}
            />
            <Stack.Screen name="+not-found" options={{ title: "Not found" }} />
          </Stack>
          <StatusBar style="light" />
        </ThemeProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  error: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xxl,
    gap: spacing.lg,
  },
  errorTitle: {
    ...typography.title,
    color: colors.text,
    textAlign: "center",
  },
  errorText: {
    ...typography.body,
    color: colors.subtext,
    textAlign: "center",
  },
});
