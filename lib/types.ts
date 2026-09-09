export type ScanRecord = {
  id: string;
  code: string;
  country: string;
  isPositive: boolean;
  source: "camera" | "manual";
  scannedAt: string; // ISO 8601, UTC
};

export type GamificationState = {
  xp: number;
  level: number;
  currentStreak: number;
  longestStreak: number;
  lastScanLocalDate: string | null; // "YYYY-MM-DD" device-local
  unlockedBadgeIds: string[];
  badgeUnlockedAt: Record<string, string>;
  voteXp: number; // XP earned from casting first-time country votes (parallel to scan XP)
  voteCount: number; // distinct countries voted on
};

export const DEFAULT_GAMIFICATION_STATE: GamificationState = {
  xp: 0,
  level: 1,
  currentStreak: 0,
  longestStreak: 0,
  lastScanLocalDate: null,
  unlockedBadgeIds: [],
  badgeUnlockedAt: {},
  voteXp: 0,
  voteCount: 0,
};
