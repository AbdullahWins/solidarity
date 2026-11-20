import ReactNativeAsyncStorage from "@react-native-async-storage/async-storage";
import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import * as FirebaseAuth from "firebase/auth";
import { getAuth, initializeAuth, type Auth, type Persistence } from "firebase/auth";
import { getFirestore, initializeFirestore, type Firestore } from "firebase/firestore";
import { Platform } from "react-native";

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

export const isFirebaseConfigured = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);

// `getReactNativePersistence` only exists in the React Native build of
// firebase/auth (resolved through the "react-native" export condition), so
// it's absent from the default type definitions.
type RNAuthModule = { getReactNativePersistence?: (storage: unknown) => Persistence };

function createAuth(app: FirebaseApp): Auth {
  if (Platform.OS === "web") return getAuth(app);
  const getRNPersistence = (FirebaseAuth as unknown as RNAuthModule).getReactNativePersistence;
  try {
    // Without an explicit persistence, the RN build of getAuth() falls back to
    // in-memory storage and users are signed out on every cold start.
    return initializeAuth(app, getRNPersistence ? { persistence: getRNPersistence(ReactNativeAsyncStorage) } : {});
  } catch {
    // Already initialised (Fast Refresh re-evaluates this module).
    return getAuth(app);
  }
}

function createFirestore(app: FirebaseApp): Firestore {
  try {
    // RN's networking layer breaks Firestore's default WebChannel streaming;
    // long polling is the documented workaround for React Native.
    return initializeFirestore(app, { experimentalForceLongPolling: Platform.OS !== "web" });
  } catch {
    return getFirestore(app);
  }
}

let auth: Auth | null = null;
let db: Firestore | null = null;

if (isFirebaseConfigured) {
  const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  auth = createAuth(app);
  db = createFirestore(app);
}

export { auth, db };
