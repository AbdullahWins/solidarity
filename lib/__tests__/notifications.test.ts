jest.mock("expo-notifications", () => ({
  setNotificationHandler: jest.fn(),
  SchedulableTriggerInputTypes: { DATE: "date" },
  AndroidImportance: { DEFAULT: 3 },
}));

import { nextReminderDates } from "../notifications";

describe("nextReminderDates", () => {
  const morning = new Date(2026, 10, 20, 10, 0, 0);
  const night = new Date(2026, 10, 20, 21, 0, 0);

  it("includes today at 19:00 when nothing was scanned yet", () => {
    const dates = nextReminderDates(morning, false);
    expect(dates).toHaveLength(7);
    expect(dates[0]).toEqual(new Date(2026, 10, 20, 19, 0, 0));
  });

  it("skips today once the user has scanned", () => {
    const dates = nextReminderDates(morning, true);
    expect(dates[0]).toEqual(new Date(2026, 10, 21, 19, 0, 0));
    expect(dates).toHaveLength(7);
  });

  it("skips today after 19:00", () => {
    expect(nextReminderDates(night, false)[0]).toEqual(new Date(2026, 10, 21, 19, 0, 0));
  });

  it("rolls over month ends", () => {
    const dates = nextReminderDates(new Date(2026, 10, 30, 20, 0, 0), false, 2);
    expect(dates).toEqual([new Date(2026, 11, 1, 19, 0, 0), new Date(2026, 11, 2, 19, 0, 0)]);
  });
});
