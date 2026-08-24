import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  where,
  type Timestamp,
} from "firebase/firestore";

import { db, isFirebaseConfigured } from "./firebase";
import { buildDailyCounts, computeScanStats } from "./gamification";
import type { GamificationState, ScanRecord } from "./types";

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
  updatedAt?: Timestamp;
  schemaVersion: 1;
};

const DAILY_COUNTS_WINDOW_DAYS = 120;
const MIN_SYNC_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

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
    displayName,
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
    schemaVersion: 1,
  };
}

export async function pushSummary(summary: CloudUserSummary): Promise<void> {
  if (!isFirebaseConfigured || !db) return;
  try {
    await setDoc(
      doc(db, "users", summary.uid),
      { ...summary, updatedAt: serverTimestamp() },
      { merge: true }
    );
  } catch {
    // best-effort only — local storage remains the source of truth
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

export async function fetchLeaderboard(topN = 100): Promise<CloudUserSummary[]> {
  if (!isFirebaseConfigured || !db) return [];
  try {
    const q = query(
      collection(db, "users"),
      where("leaderboardOptIn", "==", true),
      orderBy("xp", "desc"),
      limit(topN)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data() as CloudUserSummary);
  } catch {
    return [];
  }
}

// --- Debounced sync scheduler -------------------------------------------
// Guards Firestore's shared 20K writes/day free-tier budget: only pushes
// when local state actually changed AND at most once per MIN_SYNC_INTERVAL_MS.

let dirty = false;
let lastSyncAt = 0;
let pendingPush: (() => Promise<void>) | null = null;

export function markDirty(pushFn: () => Promise<void>) {
  dirty = true;
  pendingPush = pushFn;
  maybeFlush();
}

export async function flushSync(): Promise<void> {
  if (!dirty || !pendingPush) return;
  const push = pendingPush;
  dirty = false;
  lastSyncAt = Date.now();
  await push();
}

function maybeFlush() {
  if (Date.now() - lastSyncAt >= MIN_SYNC_INTERVAL_MS) {
    void flushSync();
  }
}
