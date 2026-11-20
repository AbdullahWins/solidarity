import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, View } from "react-native";

import { colors, radius, spacing, typography } from "../../constants/theme";
import { Button } from "../ui/Button";
import { TextField } from "../ui/TextField";

type Props = {
  visible: boolean;
  email: string | null;
  onCancel: () => void;
  /** Resolves to an error message, or null on success. */
  onConfirm: (password: string) => Promise<string | null>;
};

const WHAT_IS_DELETED = [
  "Your account and email address",
  "Your cloud backup (level, XP, streaks, badges)",
  "Your public leaderboard entry",
  "All of your votes, which are removed from the public counts",
];

export function DeleteAccountSheet({ visible, ...rest }: Props) {
  // The body only mounts while visible, so its form state starts fresh each time.
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={rest.onCancel}
      supportedOrientations={["portrait", "landscape", "portrait-upside-down", "landscape-left", "landscape-right"]}
    >
      {visible ? <SheetBody {...rest} /> : null}
    </Modal>
  );
}

function SheetBody({ email, onCancel, onConfirm }: Omit<Props, "visible">) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!password) {
      setError("Enter your password to confirm.");
      return;
    }
    setBusy(true);
    setError(null);
    const err = await onConfirm(password);
    setBusy(false);
    if (err) setError(err);
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.flex}>
        <Pressable style={styles.backdrop} onPress={busy ? undefined : onCancel} accessibilityLabel="Close">
          <Pressable style={styles.sheet} onPress={() => {}} accessibilityViewIsModal>
            <View style={styles.icon}>
              <Ionicons name="warning" size={26} color={colors.negative} />
            </View>
            <Text style={styles.title}>Delete your account?</Text>
            <Text style={styles.text}>This permanently deletes:</Text>
            <View style={styles.list}>
              {WHAT_IS_DELETED.map((item) => (
                <View key={item} style={styles.listRow}>
                  <Ionicons name="close-circle" size={16} color={colors.negative} />
                  <Text style={styles.listText}>{item}</Text>
                </View>
              ))}
            </View>
            <Text style={styles.note}>
              {"Scans stored on this device stay until you clear them in Settings. This can't be undone."}
            </Text>
            <TextField
              label={email ? `Password for ${email}` : "Password"}
              value={password}
              onChangeText={(t) => {
                setPassword(t);
                if (error) setError(null);
              }}
              secureTextEntry
              textContentType="password"
              autoComplete="current-password"
              returnKeyType="go"
              onSubmitEditing={submit}
              error={error}
              editable={!busy}
            />
            <View style={styles.buttons}>
              <Button label="Cancel" variant="secondary" onPress={onCancel} disabled={busy} style={styles.flex} />
              <Button label="Delete" variant="danger" icon="trash" onPress={submit} loading={busy} style={styles.flex} />
            </View>
          </Pressable>
        </Pressable>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  backdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
  },
  sheet: {
    width: "100%",
    maxWidth: 440,
    backgroundColor: colors.bgElevated,
    borderRadius: radius.xxl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(251, 113, 133, 0.35)",
    padding: spacing.xl,
    gap: spacing.md,
  },
  icon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "rgba(251, 113, 133, 0.14)",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    ...typography.title,
    color: colors.text,
  },
  text: {
    ...typography.body,
    color: colors.subtext,
  },
  list: {
    gap: spacing.sm,
  },
  listRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  listText: {
    ...typography.body,
    color: colors.text,
    flex: 1,
  },
  note: {
    ...typography.caption,
    color: colors.muted,
    fontWeight: "500",
  },
  buttons: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
});
