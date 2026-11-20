import {
  createUserWithEmailAndPassword,
  deleteUser,
  EmailAuthProvider,
  onAuthStateChanged,
  reauthenticateWithCredential,
  reload,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateProfile,
  type User,
} from "firebase/auth";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { deleteCloudProfile, MAX_DISPLAY_NAME, resetSync } from "../lib/cloudSync";
import { DEMO_USER, isDemo } from "../lib/demo";
import { auth, isFirebaseConfigured } from "../lib/firebase";
import { clearMyVotes, deleteAllVotesForUser } from "../lib/votes";

export type AuthError = { code: string; message: string };

type AuthContextValue = {
  user: User | null;
  emailVerified: boolean;
  loading: boolean;
  isFirebaseConfigured: boolean;
  signUp: (email: string, password: string, displayName: string) => Promise<AuthError | null>;
  signIn: (email: string, password: string) => Promise<AuthError | null>;
  signOut: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<AuthError | null>;
  deleteAccount: (password: string) => Promise<AuthError | null>;
  resendVerificationEmail: () => Promise<AuthError | null>;
  refreshVerificationStatus: () => Promise<boolean>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const FRIENDLY: Record<string, string> = {
  "auth/email-already-in-use": "That email is already registered. Try signing in.",
  "auth/invalid-email": "Enter a valid email address.",
  "auth/missing-email": "Enter your email address first.",
  "auth/weak-password": "Use a password with at least 6 characters.",
  "auth/missing-password": "Enter your password.",
  "auth/invalid-credential": "Incorrect email or password.",
  "auth/wrong-password": "Incorrect password.",
  "auth/user-not-found": "No account found with that email.",
  "auth/user-mismatch": "That password belongs to a different account.",
  "auth/requires-recent-login": "Please sign in again before doing that.",
  "auth/too-many-requests": "Too many attempts. Wait a moment and try again.",
  "auth/network-request-failed": "No connection. Check your internet and try again.",
  "auth/not-configured": "Accounts aren't available in this build.",
};

const toAuthError = (err: unknown): AuthError => {
  const code = (err as { code?: string })?.code ?? "auth/unknown";
  return { code, message: FRIENDLY[code] ?? "Something went wrong. Please try again." };
};

const notConfigured: AuthError = { code: "auth/not-configured", message: FRIENDLY["auth/not-configured"] };
const notSignedIn: AuthError = { code: "auth/no-user", message: "You're not signed in." };

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(isFirebaseConfigured);
  const [emailVerifiedOverride, setEmailVerifiedOverride] = useState<boolean | null>(null);

  useEffect(() => {
    if (isDemo()) {
      // Web-only screenshot mode (lib/demo.ts): show signed-in screens.
      setUser(DEMO_USER as unknown as User);
      setLoading(false);
      return;
    }
    if (!isFirebaseConfigured || !auth) {
      setLoading(false);
      return;
    }
    return onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setEmailVerifiedOverride(null);
      setLoading(false);
    });
  }, []);

  const signUp = useCallback<AuthContextValue["signUp"]>(async (email, password, displayName) => {
    if (!auth) return notConfigured;
    try {
      const credential = await createUserWithEmailAndPassword(auth, email, password);
      const name = displayName.replace(/\s+/g, " ").trim().slice(0, MAX_DISPLAY_NAME);
      if (name) await updateProfile(credential.user, { displayName: name });
      await sendEmailVerification(credential.user).catch(() => {});
      return null;
    } catch (err) {
      return toAuthError(err);
    }
  }, []);

  const signIn = useCallback<AuthContextValue["signIn"]>(async (email, password) => {
    if (!auth) return notConfigured;
    try {
      await signInWithEmailAndPassword(auth, email, password);
      return null;
    } catch (err) {
      return toAuthError(err);
    }
  }, []);

  const signOut = useCallback(async () => {
    if (!auth) return;
    resetSync();
    // Vote choices belong to the account, not the device.
    await clearMyVotes();
    await firebaseSignOut(auth);
  }, []);

  const sendPasswordReset = useCallback<AuthContextValue["sendPasswordReset"]>(async (email) => {
    if (!auth) return notConfigured;
    try {
      await sendPasswordResetEmail(auth, email);
      return null;
    } catch (err) {
      const mapped = toAuthError(err);
      // Don't reveal whether an account exists for this address.
      return mapped.code === "auth/user-not-found" ? null : mapped;
    }
  }, []);

  // Order matters: re-authenticate first so a stale session fails before
  // anything is deleted; then votes (they need the verified auth token for the
  // tally rule), then profile docs, then the auth user last.
  const deleteAccount = useCallback<AuthContextValue["deleteAccount"]>(async (password) => {
    const current = auth?.currentUser;
    if (!auth || !current) return notSignedIn;
    if (!current.email) return notSignedIn;
    try {
      await reauthenticateWithCredential(current, EmailAuthProvider.credential(current.email, password));
    } catch (err) {
      return toAuthError(err);
    }
    try {
      resetSync();
      await deleteAllVotesForUser(current.uid);
      await deleteCloudProfile(current.uid);
      await deleteUser(current);
      return null;
    } catch (err) {
      return toAuthError(err);
    }
  }, []);

  const resendVerificationEmail = useCallback<AuthContextValue["resendVerificationEmail"]>(async () => {
    if (!auth?.currentUser) return notSignedIn;
    try {
      await sendEmailVerification(auth.currentUser);
      return null;
    } catch (err) {
      return toAuthError(err);
    }
  }, []);

  const refreshVerificationStatus = useCallback(async (): Promise<boolean> => {
    if (!auth?.currentUser) return false;
    try {
      await reload(auth.currentUser);
    } catch {
      return false;
    }
    const verified = auth.currentUser.emailVerified;
    if (verified) {
      // Force a fresh ID token so Firestore rules see the updated
      // email_verified claim immediately (it's otherwise cached ~1hr).
      await auth.currentUser.getIdToken(true).catch(() => {});
    }
    setEmailVerifiedOverride(verified);
    return verified;
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      emailVerified: emailVerifiedOverride ?? user?.emailVerified ?? false,
      loading,
      isFirebaseConfigured,
      signUp,
      signIn,
      signOut,
      sendPasswordReset,
      deleteAccount,
      resendVerificationEmail,
      refreshVerificationStatus,
    }),
    [
      user,
      emailVerifiedOverride,
      loading,
      signUp,
      signIn,
      signOut,
      sendPasswordReset,
      deleteAccount,
      resendVerificationEmail,
      refreshVerificationStatus,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
