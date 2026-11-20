import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

const CHANNEL_ID = "streak-reminders";
const ID_PREFIX = "solidarity-streak-";
const LEGACY_DAILY_ID = "solidarity-streak-reminder";
const REMINDER_HOUR = 19;
const DAYS_AHEAD = 7;

if (Platform.OS !== "web") {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (Platform.OS === "web") return false;
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;
  const requested = await Notifications.requestPermissionsAsync({
    ios: { allowAlert: true, allowSound: false, allowBadge: false },
  });
  return requested.granted;
}

/**
 * The next reminder times: 19:00 local on each of the next `days` days,
 * skipping today if the user already scanned today or it's already past 19:00.
 * Pure so it can be unit tested.
 */
export function nextReminderDates(now: Date, scannedToday: boolean, days = DAYS_AHEAD): Date[] {
  const dates: Date[] = [];
  for (let offset = 0; dates.length < days && offset <= days; offset++) {
    const at = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset, REMINDER_HOUR, 0, 0, 0);
    if (offset === 0 && (scannedToday || at.getTime() <= now.getTime())) continue;
    dates.push(at);
  }
  return dates;
}

async function cancelAll() {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync().catch(() => []);
  await Promise.all(
    scheduled
      .filter((n) => n.identifier.startsWith(ID_PREFIX))
      .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier).catch(() => {}))
  );
  await Notifications.cancelScheduledNotificationAsync(LEGACY_DAILY_ID).catch(() => {});
}

/**
 * (Re)builds the rolling window of one-off reminders. Called when the
 * setting is turned on, after every scan, and when the app returns to the
 * foreground, so the window always rolls forward and a scan today removes
 * today's reminder. A single DAILY trigger can't skip a day, which is why the
 * old reminder fired even after the user had scanned.
 */
export async function scheduleStreakReminders(lastScanLocalDate: string | null): Promise<void> {
  if (Platform.OS === "web") return;
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: "Streak reminders",
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }
  await cancelAll();

  const now = new Date();
  const scannedToday = lastScanLocalDate === now.toLocaleDateString("en-CA");
  const dates = nextReminderDates(now, scannedToday);

  await Promise.all(
    dates.map((date, i) =>
      Notifications.scheduleNotificationAsync({
        identifier: `${ID_PREFIX}${i}`,
        content: {
          title: "Keep your streak alive 🔥",
          body: "You haven't scanned anything today. One scan keeps your streak going.",
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date,
          channelId: CHANNEL_ID,
        },
      })
    )
  );
}

export async function cancelStreakReminders(): Promise<void> {
  if (Platform.OS === "web") return;
  await cancelAll();
}
