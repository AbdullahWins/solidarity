import AsyncStorage from "@react-native-async-storage/async-storage";

export type Preferences = {
  hapticsEnabled: boolean;
  streakReminderEnabled: boolean;
};

export const DEFAULT_PREFERENCES: Preferences = {
  hapticsEnabled: true,
  streakReminderEnabled: false,
};

const KEY = "solidarity:v1:preferences";

// In-memory mirror so synchronous call sites (e.g. haptics on scan) don't
// need to await AsyncStorage on every call.
let cached: Preferences = DEFAULT_PREFERENCES;

export async function getPreferences(): Promise<Preferences> {
  const raw = await AsyncStorage.getItem(KEY);
  if (!raw) return DEFAULT_PREFERENCES;
  try {
    cached = { ...DEFAULT_PREFERENCES, ...(JSON.parse(raw) as Preferences) };
    return cached;
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

export async function savePreferences(prefs: Preferences): Promise<void> {
  cached = prefs;
  await AsyncStorage.setItem(KEY, JSON.stringify(prefs));
}

export function getCachedPreferences(): Preferences {
  return cached;
}
