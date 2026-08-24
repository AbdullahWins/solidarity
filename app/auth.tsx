import { router, Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text } from "react-native";

import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { ScreenContainer } from "../components/ui/ScreenContainer";
import { TextField } from "../components/ui/TextField";
import { useAuth } from "../contexts/AuthContext";
import { colors, spacing, typography } from "../constants/theme";

type Mode = "sign-in" | "sign-up";

export default function AuthScreen() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<Mode>("sign-in");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    setError(null);
    if (!email.trim() || !password) {
      setError("Enter your email and password.");
      return;
    }
    setSubmitting(true);
    const result =
      mode === "sign-in"
        ? await signIn(email.trim(), password)
        : await signUp(email.trim(), password, displayName);
    setSubmitting(false);

    if (result) {
      setError(result.message);
      return;
    }
    router.back();
  };

  return (
    <>
      <Stack.Screen options={{ title: mode === "sign-in" ? "Sign In" : "Create Account" }} />
      <ScreenContainer>
        <StatusBar style="light" />
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <Card style={styles.card}>
              <Text style={styles.title}>
                {mode === "sign-in" ? "Welcome back" : "Create your account"}
              </Text>
              <Text style={styles.subtitle}>
                Back up your level, streak, and badges to the cloud. Your scan history always
                stays on this device.
              </Text>

              {mode === "sign-up" && (
                <TextField
                  label="Display name"
                  value={displayName}
                  onChangeText={setDisplayName}
                  placeholder="e.g. Nadia"
                />
              )}
              <TextField
                label="Email"
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
                keyboardType="email-address"
              />
              <TextField
                label="Password"
                value={password}
                onChangeText={setPassword}
                placeholder="At least 6 characters"
                secureTextEntry
              />

              {error && <Text style={styles.error}>{error}</Text>}

              <Button
                label={mode === "sign-in" ? "Sign In" : "Sign Up"}
                onPress={handleSubmit}
                loading={submitting}
                style={{ marginTop: spacing.sm }}
              />
              <Button
                label={
                  mode === "sign-in" ? "Need an account? Sign up" : "Have an account? Sign in"
                }
                variant="ghost"
                onPress={() => {
                  setError(null);
                  setMode(mode === "sign-in" ? "sign-up" : "sign-in");
                }}
              />
            </Card>

            <Button
              label="Continue without an account"
              variant="secondary"
              onPress={() => router.back()}
            />
          </ScrollView>
        </KeyboardAvoidingView>
      </ScreenContainer>
    </>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },
  card: {
    gap: spacing.md,
  },
  title: {
    ...typography.title,
    color: colors.text,
  },
  subtitle: {
    ...typography.body,
    color: colors.subtext,
    lineHeight: 19,
  },
  error: {
    ...typography.caption,
    color: colors.negativeStrong,
  },
});
