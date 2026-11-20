import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useRef, useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import Animated, { FadeIn, LinearTransition } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { IconButton } from "../components/ui/IconButton";
import { ScreenBackground } from "../components/ui/Screen";
import { SegmentedControl } from "../components/ui/SegmentedControl";
import { TextField } from "../components/ui/TextField";
import { LINKS } from "../constants/app-info";
import { colors, spacing, typography } from "../constants/theme";
import { useAuth } from "../contexts/AuthContext";
import { MAX_DISPLAY_NAME } from "../lib/cloudSync";
import { openInAppBrowser } from "../lib/links";

type Mode = "sign-in" | "sign-up";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const logo = require("../assets/images/logo.png");

export default function AuthScreen() {
  const { signIn, signUp, sendPasswordReset } = useAuth();
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState<Mode>("sign-in");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [resetting, setResetting] = useState(false);
  const emailRef = useRef<React.ComponentRef<typeof TextInput>>(null);
  const passwordRef = useRef<React.ComponentRef<typeof TextInput>>(null);

  const close = () => (router.canGoBack() ? router.back() : router.replace("/"));

  const handleSubmit = async () => {
    setError(null);
    const trimmed = email.trim();
    if (!EMAIL_RE.test(trimmed)) return setError("Enter a valid email address.");
    if (password.length < (mode === "sign-up" ? 8 : 1))
      return setError(mode === "sign-up" ? "Use at least 8 characters for your password." : "Enter your password.");
    setSubmitting(true);
    const result = mode === "sign-in" ? await signIn(trimmed, password) : await signUp(trimmed, password, displayName);
    setSubmitting(false);
    if (result) return setError(result.message);
    if (mode === "sign-up") {
      Alert.alert("Check your inbox", `We sent a verification link to ${trimmed}. Verify it to vote and join the leaderboard.`);
    }
    close();
  };

  const handleReset = async () => {
    const trimmed = email.trim();
    if (!EMAIL_RE.test(trimmed)) {
      setError("Enter your email above, then tap “Forgot password?”.");
      emailRef.current?.focus();
      return;
    }
    setResetting(true);
    const err = await sendPasswordReset(trimmed);
    setResetting(false);
    if (err) return setError(err.message);
    Alert.alert("Check your email", `If an account exists for ${trimmed}, you'll get a link to reset your password.`);
  };

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <ScreenBackground />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView
          contentContainerStyle={[
            styles.content,
            {
              paddingTop: insets.top + spacing.md,
              paddingBottom: insets.bottom + spacing.xl,
              paddingLeft: insets.left + spacing.lg,
              paddingRight: insets.right + spacing.lg,
            },
          ]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
        >
          <View style={styles.column}>
            <View style={styles.topBar}>
              <IconButton icon="close" onPress={close} accessibilityLabel="Close" />
            </View>

            <Animated.View entering={FadeIn.duration(300)} style={styles.brand}>
              <Image source={logo} style={styles.logo} contentFit="contain" accessibilityIgnoresInvertColors />
              <Text style={styles.title} accessibilityRole="header">
                {mode === "sign-in" ? "Welcome back" : "Create your account"}
              </Text>
              <Text style={styles.subtitle}>
                Back up your level, streaks and badges, vote on countries and join the leaderboard. Your scan history stays
                on this device.
              </Text>
            </Animated.View>

            <Card style={styles.card}>
              <SegmentedControl
                segments={[
                  { key: "sign-in", label: "Sign in" },
                  { key: "sign-up", label: "Create account" },
                ]}
                value={mode}
                onChange={(k) => {
                  setError(null);
                  setMode(k as Mode);
                }}
              />

              <Animated.View layout={LinearTransition} style={styles.fields}>
                {mode === "sign-up" && (
                  <Animated.View entering={FadeIn}>
                    <TextField
                      label="Display name"
                      icon="person-outline"
                      value={displayName}
                      onChangeText={setDisplayName}
                      placeholder="Shown on the leaderboard"
                      autoCapitalize="words"
                      autoComplete="nickname"
                      textContentType="nickname"
                      maxLength={MAX_DISPLAY_NAME}
                      returnKeyType="next"
                      onSubmitEditing={() => emailRef.current?.focus()}
                    />
                  </Animated.View>
                )}
                <TextField
                  ref={emailRef}
                  label="Email"
                  icon="mail-outline"
                  value={email}
                  onChangeText={setEmail}
                  placeholder="you@example.com"
                  keyboardType="email-address"
                  autoComplete="email"
                  textContentType="emailAddress"
                  returnKeyType="next"
                  onSubmitEditing={() => passwordRef.current?.focus()}
                />
                <TextField
                  ref={passwordRef}
                  label="Password"
                  icon="lock-closed-outline"
                  value={password}
                  onChangeText={setPassword}
                  placeholder={mode === "sign-up" ? "At least 8 characters" : "Your password"}
                  secureTextEntry
                  autoComplete={mode === "sign-up" ? "new-password" : "current-password"}
                  textContentType={mode === "sign-up" ? "newPassword" : "password"}
                  returnKeyType="go"
                  onSubmitEditing={handleSubmit}
                />
              </Animated.View>

              {error ? (
                <View style={styles.errorBox} accessibilityLiveRegion="polite">
                  <Ionicons name="alert-circle" size={16} color={colors.negative} />
                  <Text style={styles.error}>{error}</Text>
                </View>
              ) : null}

              <Button
                label={mode === "sign-in" ? "Sign in" : "Create account"}
                variant="brand"
                size="lg"
                onPress={handleSubmit}
                loading={submitting}
              />

              {mode === "sign-in" ? (
                <Button label="Forgot password?" variant="ghost" onPress={handleReset} loading={resetting} />
              ) : (
                <Text style={styles.legal}>
                  By creating an account you agree to the{" "}
                  <Text style={styles.link} onPress={() => openInAppBrowser(LINKS.terms)} accessibilityRole="link">
                    Terms of Service
                  </Text>{" "}
                  and{" "}
                  <Text style={styles.link} onPress={() => openInAppBrowser(LINKS.privacy)} accessibilityRole="link">
                    Privacy Policy
                  </Text>
                  .
                </Text>
              )}
            </Card>

            <Button label="Continue without an account" variant="ghost" onPress={close} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  flex: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    alignItems: "center",
  },
  column: {
    width: "100%",
    maxWidth: 460,
    gap: spacing.lg,
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  brand: {
    alignItems: "center",
    gap: spacing.sm,
  },
  logo: {
    width: 64,
    height: 64,
    borderRadius: 18,
    marginBottom: spacing.sm,
  },
  title: {
    ...typography.display,
    color: colors.text,
    textAlign: "center",
  },
  subtitle: {
    ...typography.body,
    color: colors.subtext,
    textAlign: "center",
  },
  card: {
    gap: spacing.lg,
  },
  fields: {
    gap: spacing.md,
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: "rgba(251, 113, 133, 0.1)",
    borderRadius: 12,
    padding: spacing.md,
  },
  error: {
    ...typography.caption,
    color: colors.negative,
    flex: 1,
  },
  legal: {
    ...typography.caption,
    color: colors.muted,
    fontWeight: "500",
    textAlign: "center",
    lineHeight: 18,
  },
  link: {
    color: colors.accent,
    fontWeight: "700",
  },
});
