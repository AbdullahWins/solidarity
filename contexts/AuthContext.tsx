import {
  createUserWithEmailAndPassword,
  deleteUser,
  onAuthStateChanged,
  reload,
  sendEmailVerification,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateProfile,
  type User,
} from "firebase/auth";
import { deleteDoc, doc } from "firebase/firestore";
import React, { createContext, useContext, useEffect, useState } from "react";

import { auth, db, isFirebaseConfigured } from "../lib/firebase";

type AuthError = { code: string; message: string };

type AuthContextValue = {
  user: User | null;
  emailVerified: boolean;
  loading: boolean;
  isFirebaseConfigured: boolean;
  signUp: (email: string, password: string, displayName: string) => Promise<AuthError | null>;
  signIn: (email: string, password: string) => Promise<AuthError | null>;
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<AuthError | null>;
  resendVerificationEmail: () => Promise<AuthError | null>;
  refreshVerificationStatus: () => Promise<boolean>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const toAuthError = (err: unknown): AuthError => {
  const code = (err as { code?: string })?.code ?? "auth/unknown";
  const friendly: Record<string, string> = {
    "auth/email-already-in-use": "That email is already registered.",
    "auth/invalid-email": "Enter a valid email address.",
    "auth/weak-password": "Password should be at least 6 characters.",
    "auth/invalid-credential": "Incorrect email or password.",
    "auth/wrong-password": "Incorrect email or password.",
    "auth/user-not-found": "No account found with that email.",
    "auth/requires-recent-login": "Please sign in again before doing that.",
    "auth/too-many-requests": "Too many attempts. Try again later.",
  };
  return { code, message: friendly[code] ?? "Something went wrong. Please try again." };
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(isFirebaseConfigured);
  const [emailVerifiedOverride, setEmailVerifiedOverride] = useState<boolean | null>(null);

  useEffect(() => {
    if (!isFirebaseConfigured || !auth) {
      setLoading(false);
      return;
    }
    const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setEmailVerifiedOverride(null);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const signUp: AuthContextValue["signUp"] = async (email, password, displayName) => {
    if (!auth) return { code: "auth/not-configured", message: "Accounts aren't set up yet." };
    try {
      const credential = await createUserWithEmailAndPassword(auth, email, password);
      if (displayName.trim()) {
        await updateProfile(credential.user, { displayName: displayName.trim() });
      }
      await sendEmailVerification(credential.user).catch(() => {});
      return null;
    } catch (err) {
      return toAuthError(err);
    }
  };

  const signIn: AuthContextValue["signIn"] = async (email, password) => {
    if (!auth) return { code: "auth/not-configured", message: "Accounts aren't set up yet." };
    try {
      await signInWithEmailAndPassword(auth, email, password);
      return null;
    } catch (err) {
      return toAuthError(err);
    }
  };

  const signOut = async () => {
    if (!auth) return;
    await firebaseSignOut(auth);
  };

  const deleteAccount: AuthContextValue["deleteAccount"] = async () => {
    if (!auth?.currentUser) return { code: "auth/not-configured", message: "Not signed in." };
    try {
      if (db) {
        await deleteDoc(doc(db, "users", auth.currentUser.uid)).catch(() => {});
      }
      await deleteUser(auth.currentUser);
      return null;
    } catch (err) {
      return toAuthError(err);
    }
  };

  const resendVerificationEmail: AuthContextValue["resendVerificationEmail"] = async () => {
    if (!auth?.currentUser) return { code: "auth/not-configured", message: "Not signed in." };
    try {
      await sendEmailVerification(auth.currentUser);
      return null;
    } catch (err) {
      return toAuthError(err);
    }
  };

  const refreshVerificationStatus = async (): Promise<boolean> => {
    if (!auth?.currentUser) return false;
    await reload(auth.currentUser);
    const verified = auth.currentUser.emailVerified;
    if (verified) {
      // Force a fresh ID token so Firestore rules see the updated
      // email_verified claim immediately (it's otherwise cached ~1hr).
      await auth.currentUser.getIdToken(true).catch(() => {});
    }
    setEmailVerifiedOverride(verified);
    return verified;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        emailVerified: emailVerifiedOverride ?? user?.emailVerified ?? false,
        loading,
        isFirebaseConfigured,
        signUp,
        signIn,
        signOut,
        deleteAccount,
        resendVerificationEmail,
        refreshVerificationStatus,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
