/** How a barcode was captured: live camera, typed, or read from an image. */
export type ScanSource = "camera" | "manual" | "photo";

export type ScanRecord = {
  id: string;
  code: string;
  country: string;
  isPositive: boolean;
  source: ScanSource;
  scannedAt: string; // ISO 8601, UTC
  /** The user's personal rule for this country at scan time, if any. */
  rule?: "avoid" | "support";
  /** From Open Food Facts, when product names are on and it was found. */
  productName?: string;
  brand?: string;
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
