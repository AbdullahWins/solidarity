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
