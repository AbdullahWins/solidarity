import * as Haptics from "expo-haptics";
import { Platform } from "react-native";

import { getCachedPreferences } from "./preferences";

const enabled = () => Platform.OS !== "web" && getCachedPreferences().hapticsEnabled;

export function hapticNotification(type: Haptics.NotificationFeedbackType) {
  if (!enabled()) return;
  Haptics.notificationAsync(type).catch(() => {});
}

export function hapticSelection() {
  if (!enabled()) return;
  Haptics.selectionAsync().catch(() => {});
}

export function hapticImpact(style: Haptics.ImpactFeedbackStyle = Haptics.ImpactFeedbackStyle.Light) {
  if (!enabled()) return;
  Haptics.impactAsync(style).catch(() => {});
}

/** Gap between the two pulses of the "avoid" pattern. */
export const AVOID_PULSE_GAP_MS = 120;

/**
 * The verdict pattern, distinct even on devices that play every notification
 * type the same way: one success tap for fine or neutral, two heavy pulses
 * for avoid.
 */
export function hapticVerdict(tone: "positive" | "negative" | "neutral") {
  if (!enabled()) return;
  if (tone !== "negative") {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    return;
  }
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
  setTimeout(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
  }, AVOID_PULSE_GAP_MS);
}

/** Lighter version for basket additions: one light tap, or two for avoid. */
export function hapticBasketAdd(tone: "positive" | "negative" | "neutral") {
  if (!enabled()) return;
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  if (tone === "negative") {
    setTimeout(() => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    }, AVOID_PULSE_GAP_MS);
  }
}
