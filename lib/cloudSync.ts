import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  type Timestamp,
} from "firebase/firestore";

import { db, isFirebaseConfigured } from "./firebase";
import { buildDailyCounts, computeScanStats } from "./gamification";
import type { GamificationState, ScanRecord } from "./types";
import { getCachedMyVotes, type VoteChoice } from "./votes";

/** Private per-user backup at users/{uid}. Readable only by its owner. */
export type CloudUserSummary = {
  uid: string;
  displayName: string;
  leaderboardOptIn: boolean;
  xp: number;
  level: number;
  currentStreak: number;
  longestStreak: number;
  totalScans: number;
  positiveScans: number;
  negativeScans: number;
  dailyCounts: Record<string, number>;
  unlockedBadgeIds: string[];
  badgeUnlockedAt: Record<string, string>;
  voteXp: number;
  voteCount: number;
  myVotes: Record<string, VoteChoice>;
  updatedAt?: Timestamp;
  schemaVersion: 1;
};

/** Public leaderboard row at leaderboard/{uid}. Only what the leaderboard shows. */
export type LeaderboardEntry = {
  uid: string;
  displayName: string;
  xp: number;
  level: number;
  currentStreak: number;
  longestStreak: number;
  updatedAt?: Timestamp;
};

export const MAX_DISPLAY_NAME = 30;
const DAILY_COUNTS_WINDOW_DAYS = 120;
const MIN_SYNC_INTERVAL_MS = 5 * 60 * 1000;

export const sanitizeDisplayName = (name: string | null | undefined): string => {
  const cleaned = (name ?? "").replace(/\s+/g, " ").trim().slice(0, MAX_DISPLAY_NAME);
  return cleaned || "Scanner";
};

const pruneDailyCounts = (counts: Record<string, number>): Record<string, number> => {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - DAILY_COUNTS_WINDOW_DAYS);
  const cutoffStr = cutoff.toLocaleDateString("en-CA");
  const pruned: Record<string, number> = {};
  for (const [day, count] of Object.entries(counts)) {
    if (day >= cutoffStr) pruned[day] = count;
  }
  return pruned;
};

export function toCloudSummary(
  uid: string,
  displayName: string,
  leaderboardOptIn: boolean,
  scans: ScanRecord[],
  gamification: GamificationState
): CloudUserSummary {
  const stats = computeScanStats(scans);
  return {
    uid,
    displayName: sanitizeDisplayName(displayName),
    leaderboardOptIn,
    xp: gamification.xp,
    level: gamification.level,
    currentStreak: gamification.currentStreak,
    longestStreak: gamification.longestStreak,
    totalScans: stats.total,
    positiveScans: stats.positive,
    negativeScans: stats.negative,
    dailyCounts: pruneDailyCounts(buildDailyCounts(scans)),
    unlockedBadgeIds: gamification.unlockedBadgeIds,
    badgeUnlockedAt: gamification.badgeUnlockedAt,
    voteXp: gamification.voteXp,
    voteCount: gamification.voteCount,
    myVotes: getCachedMyVotes(),
    schemaVersion: 1,
  };
}

const toLeaderboardEntry = (s: CloudUserSummary) => ({
  uid: s.uid,
  displayName: s.displayName,
  xp: s.xp,
  level: s.level,
  currentStreak: s.currentStreak,
  longestStreak: s.longestStreak,
  updatedAt: serverTimestamp(),
});

/**
 * Writes the private backup, and mirrors (or removes) the public leaderboard
 * row. `removeFromLeaderboard` is only set on an explicit opt-out so the
 * passive scan sync never spends a delete write it doesn't need.
 */
export async function pushSummary(
  summary: CloudUserSummary,
  options: { removeFromLeaderboard?: boolean } = {}
): Promise<boolean> {
  if (!isFirebaseConfigured || !db) return false;
  try {
    await setDoc(doc(db, "users", summary.uid), { ...summary, updatedAt: serverTimestamp() }, { merge: true });
    if (summary.leaderboardOptIn) {
      await setDoc(doc(db, "leaderboard", summary.uid), toLeaderboardEntry(summary));
    } else if (options.removeFromLeaderboard) {
      await deleteDoc(doc(db, "leaderboard", summary.uid));
    }
    return true;
  } catch (err) {
    if (__DEV__) console.warn("pushSummary failed:", err);
    return false;
  }
}

export async function pullSummary(uid: string): Promise<CloudUserSummary | null> {
  if (!isFirebaseConfigured || !db) return null;
  try {
    const snap = await getDoc(doc(db, "users", uid));
    return snap.exists() ? (snap.data() as CloudUserSummary) : null;
  } catch {
    return null;
  }
}

export async function fetchLeaderboard(topN = 100): Promise<LeaderboardEntry[]> {
  if (!isFirebaseConfigured || !db) return [];
  try {
    const snap = await getDocs(query(collection(db, "leaderboard"), orderBy("xp", "desc"), limit(topN)));
    return snap.docs.map((d) => d.data() as LeaderboardEntry);
  } catch (err) {
    if (__DEV__) console.warn("fetchLeaderboard failed:", err);
    return [];
  }
}

/** Removes the public leaderboard row and the private backup. */
export async function deleteCloudProfile(uid: string): Promise<void> {
  if (!db) return;
  await deleteDoc(doc(db, "leaderboard", uid));
  await deleteDoc(doc(db, "users", uid));
}

// --- Debounced sync scheduler -------------------------------------------
// Guards Firestore's free-tier write budget: only pushes when local state
// actually changed, and at most once per MIN_SYNC_INTERVAL_MS. Anything
// pending is flushed when the app goes to the background.

let dirty = false;
let lastSyncAt = 0;
let pendingPush: (() => Promise<void>) | null = null;

export function markDirty(pushFn: () => Promise<void>) {
  dirty = true;
  pendingPush = pushFn;
  if (Date.now() - lastSyncAt >= MIN_SYNC_INTERVAL_MS) void flushSync();
}

export async function flushSync(): Promise<void> {
  if (!dirty || !pendingPush) return;
  const push = pendingPush;
  dirty = false;
  pendingPush = null;
  lastSyncAt = Date.now();
  await push();
}

/** Drop anything queued (sign-out / account deletion). */
export function resetSync() {
  dirty = false;
  pendingPush = null;
  lastSyncAt = 0;
}
