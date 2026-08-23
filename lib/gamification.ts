import { badgeDefinitions } from "./badges";
import { DEFAULT_GAMIFICATION_STATE, type GamificationState, type ScanRecord } from "./types";

export const getLocalDateString = (isoDate: string): string => {
  const date = new Date(isoDate);
  return date.toLocaleDateString("en-CA"); // YYYY-MM-DD, local timezone
};

const todayLocalDateString = (): string => new Date().toLocaleDateString("en-CA");

const addDaysToLocalDateString = (dateStr: string, days: number): string => {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + days);
  return date.toLocaleDateString("en-CA");
};

export const xpForLevel = (level: number): number => 50 * level * level;

export const computeLevel = (xp: number): number => {
  let level = 1;
  while (xp >= xpForLevel(level + 1) && level < 50) {
    level += 1;
  }
  return level;
};

export const levelProgress = (xp: number) => {
  const level = computeLevel(xp);
  const currentThreshold = xpForLevel(level);
  const nextThreshold = xpForLevel(level + 1);
  const span = nextThreshold - currentThreshold;
  const progress = span > 0 ? (xp - currentThreshold) / span : 1;
  return {
    level,
    currentThreshold,
    nextThreshold,
    progress: Math.max(0, Math.min(1, progress)),
  };
};

export const buildDailyCounts = (scans: ScanRecord[]): Record<string, number> => {
  const counts: Record<string, number> = {};
  for (const scan of scans) {
    const day = getLocalDateString(scan.scannedAt);
    counts[day] = (counts[day] ?? 0) + 1;
  }
  return counts;
};

const computeStreaks = (dailyCounts: Record<string, number>) => {
  const days = Object.keys(dailyCounts).sort();
  const daySet = new Set(days);

  let longestStreak = 0;
  let run = 0;
  let prevDay: string | null = null;
  for (const day of days) {
    if (prevDay && addDaysToLocalDateString(prevDay, 1) === day) {
      run += 1;
    } else {
      run = 1;
    }
    longestStreak = Math.max(longestStreak, run);
    prevDay = day;
  }

  const today = todayLocalDateString();
  let cursor = daySet.has(today) ? today : addDaysToLocalDateString(today, -1);
  let currentStreak = 0;
  while (daySet.has(cursor)) {
    currentStreak += 1;
    cursor = addDaysToLocalDateString(cursor, -1);
  }

  return { currentStreak, longestStreak };
};

const XP_PER_SCAN = 10;
const XP_NEW_DAY_BONUS = 15;
const DUPLICATE_WINDOW_MS = 60_000;

export const computeXp = (scans: ScanRecord[]): number => {
  // scans is expected newest-first; iterate oldest-first for chronological bonus logic
  const chronological = [...scans].sort(
    (a, b) => new Date(a.scannedAt).getTime() - new Date(b.scannedAt).getTime()
  );

  let xp = 0;
  let lastDay: string | null = null;
  const seenTimestamps: number[] = [];

  for (const scan of chronological) {
    const scanTime = new Date(scan.scannedAt).getTime();
    const isDuplicate = seenTimestamps.some(
      (t) => Math.abs(t - scanTime) <= DUPLICATE_WINDOW_MS
    );
    seenTimestamps.push(scanTime);

    if (isDuplicate) continue;

    xp += XP_PER_SCAN;
    const day = getLocalDateString(scan.scannedAt);
    if (day !== lastDay) {
      xp += XP_NEW_DAY_BONUS;
      lastDay = day;
    }
  }

  return xp;
};

export function computeGamificationState(
  scans: ScanRecord[],
  previousState: GamificationState = DEFAULT_GAMIFICATION_STATE
): GamificationState {
  if (scans.length === 0) {
    return DEFAULT_GAMIFICATION_STATE;
  }

  const dailyCounts = buildDailyCounts(scans);
  const { currentStreak, longestStreak } = computeStreaks(dailyCounts);
  const xp = computeXp(scans);
  const level = computeLevel(xp);

  const partialState: GamificationState = {
    xp,
    level,
    currentStreak,
    longestStreak,
    lastScanLocalDate: getLocalDateString(scans[0].scannedAt),
    unlockedBadgeIds: [],
    badgeUnlockedAt: {},
  };

  const unlockedBadgeIds: string[] = [];
  const badgeUnlockedAt: Record<string, string> = {};
  const nowIso = new Date().toISOString();

  for (const badge of badgeDefinitions) {
    if (badge.check(scans, partialState)) {
      unlockedBadgeIds.push(badge.id);
      badgeUnlockedAt[badge.id] = previousState.badgeUnlockedAt[badge.id] ?? nowIso;
    }
  }

  return {
    ...partialState,
    unlockedBadgeIds,
    badgeUnlockedAt,
  };
}

export function computeScanStats(scans: ScanRecord[]) {
  const total = scans.length;
  const positive = scans.filter((s) => s.isPositive).length;
  const negative = total - positive;
  return { total, positive, negative };
}
