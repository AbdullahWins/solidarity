import { Ionicons } from "@expo/vector-icons";
import { useFonts } from "expo-font";
import { DarkTheme, router, Stack, ThemeProvider, type ErrorBoundaryProps } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import * as SystemUI from "expo-system-ui";
import { useEffect, useState } from "react";
import { AppState, StyleSheet, Text, View } from "react-native";
import "react-native-reanimated";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { QuickActionHandler } from "@/components/navigation/QuickActionHandler";
import { Button } from "@/components/ui/Button";
import { colors, spacing, typography } from "@/constants/theme";
import { AuthProvider } from "@/contexts/AuthContext";
import { scheduleStreakReminders } from "@/lib/notifications";
import { shouldShowOnboarding } from "@/lib/onboarding";
import { getPreferences } from "@/lib/preferences";
import { getGamificationState } from "@/lib/storage";
import { loadBasket } from "@/lib/basket";
import { loadBrandRules } from "@/lib/brandRules";
import { loadRules } from "@/lib/countryRules";
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
  const [needsIntro, setNeedsIntro] = useState<boolean | null>(null);

  useEffect(() => {
    void SystemUI.setBackgroundColorAsync(colors.bg).catch(() => {});
    void loadMyVotes();
    void loadRules();
    void loadBrandRules();
    void loadBasket();
    void refreshReminders();
    void shouldShowOnboarding().then(setNeedsIntro);
    const sub = AppState.addEventListener("change", (s) => {
      if (s === "active") void refreshReminders();
    });
    return () => sub.remove();
  }, []);

  const ready = (loaded || !!fontError) && needsIntro !== null;

  useEffect(() => {
    if (!ready) return;
    // Present the intro over the tabs, then lift the splash once it's up.
    // Deferred a tick: the Stack must be mounted before navigating.
    const nav = needsIntro ? setTimeout(() => router.push("/onboarding"), 0) : undefined;
    const t = setTimeout(() => void SplashScreen.hideAsync().catch(() => {}), needsIntro ? 150 : 0);
    return () => {
      clearTimeout(t);
      if (nav) clearTimeout(nav);
    };
  }, [ready, needsIntro]);

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
            <Stack.Screen
              name="onboarding"
              options={{ presentation: "fullScreenModal", animation: "fade", headerShown: false, gestureEnabled: false }}
            />
            <Stack.Screen name="country/[name]" options={{ headerShown: false, animation: "slide_from_right" }} />
            <Stack.Screen name="profile" options={{ title: "Profile", headerBackTitle: "Back", animation: "slide_from_right" }} />
            <Stack.Screen name="settings" options={{ title: "Settings", headerBackTitle: "Back", animation: "slide_from_right" }} />
            <Stack.Screen name="rules" options={{ title: "My rules", headerBackTitle: "Back", animation: "slide_from_right" }} />
            <Stack.Screen name="backup-preview" options={{ title: "Import data", headerBackTitle: "Back", presentation: "modal" }} />
            <Stack.Screen name="basket" options={{ title: "Basket", headerBackTitle: "Back", presentation: "modal" }} />
            <Stack.Screen name="+not-found" options={{ title: "Not found" }} />
          </Stack>
          <QuickActionHandler skipInitial={!!needsIntro} />
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
