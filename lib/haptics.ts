import * as Haptics from "expo-haptics";

import { getCachedPreferences } from "./preferences";

export function hapticNotification(type: Haptics.NotificationFeedbackType) {
  if (!getCachedPreferences().hapticsEnabled) return;
  Haptics.notificationAsync(type).catch(() => {});
}
