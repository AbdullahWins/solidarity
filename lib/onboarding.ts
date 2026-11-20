import AsyncStorage from "@react-native-async-storage/async-storage";

import { getScans } from "./storage";

const KEY = "solidarity:v1:onboarded";

/** True when the intro should open automatically (first run, no existing scans). */
export async function shouldShowOnboarding(): Promise<boolean> {
  try {
    if ((await AsyncStorage.getItem(KEY)) === "1") return false;
    // Users updating from an older version already know the app.
    if ((await getScans()).length > 0) {
      await markOnboarded();
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

export async function markOnboarded(): Promise<void> {
  await AsyncStorage.setItem(KEY, "1").catch(() => {});
}
