import AsyncStorage from "@react-native-async-storage/async-storage";
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

import { DEMO_LEADERBOARD, isDemo } from "./demo";
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
// Writes are the binding free-tier quota once reads are cheap: at most one
// push per 15 min while active, plus the flush when the app backgrounds.
const MIN_SYNC_INTERVAL_MS = 15 * 60 * 1000;

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
      await patchLeaderboardCache({ upsert: toCachedEntry(summary) });
    } else if (options.removeFromLeaderboard) {
      await deleteDoc(doc(db, "leaderboard", summary.uid));
      await patchLeaderboardCache({ removeUid: summary.uid });
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

// --- Leaderboard cache ----------------------------------------------------
// Each fetch costs up to LEADERBOARD_TOP_N reads, so the list is cached on the
// device. The user's own row is patched locally after each push, so opting in
// or scanning shows up without a refetch.

export const LEADERBOARD_TOP_N = 50;
const LEADERBOARD_TTL_MS = 30 * 60 * 1000;
const FORCED_REFRESH_MIN_MS = 60 * 1000;
const LEADERBOARD_CACHE_KEY = "solidarity:v1:leaderboardCache";

type LeaderboardCache = { entries: LeaderboardEntry[]; fetchedAt: number };

let leaderboardMemory: LeaderboardCache | null = null;
let lastForcedAt = 0;

// Timestamps don't survive JSON, and the screen doesn't show them.
const toCachedEntry = (e: LeaderboardEntry | CloudUserSummary): LeaderboardEntry => ({
  uid: e.uid,
  displayName: e.displayName,
  xp: e.xp,
  level: e.level,
  currentStreak: e.currentStreak,
  longestStreak: e.longestStreak,
});

async function readLeaderboardCache(): Promise<LeaderboardCache | null> {
  if (leaderboardMemory) return leaderboardMemory;
  try {
    const raw = await AsyncStorage.getItem(LEADERBOARD_CACHE_KEY);
    leaderboardMemory = raw ? (JSON.parse(raw) as LeaderboardCache) : null;
  } catch {
    leaderboardMemory = null;
  }
  return leaderboardMemory;
}

async function writeLeaderboardCache(cache: LeaderboardCache | null): Promise<void> {
  leaderboardMemory = cache;
  try {
    if (cache) await AsyncStorage.setItem(LEADERBOARD_CACHE_KEY, JSON.stringify(cache));
    else await AsyncStorage.removeItem(LEADERBOARD_CACHE_KEY);
  } catch {
    // best-effort only
  }
}

/** Applies the user's own change to the cached list without spending reads. */
export async function patchLeaderboardCache(change: { upsert?: LeaderboardEntry; removeUid?: string }): Promise<void> {
  const cache = await readLeaderboardCache();
  if (!cache) return; // nothing cached yet; the next fetch will include it
  const uid = change.upsert?.uid ?? change.removeUid;
  let entries = cache.entries.filter((e) => e.uid !== uid);
  if (change.upsert) {
    entries = [...entries, change.upsert].sort((a, b) => b.xp - a.xp).slice(0, LEADERBOARD_TOP_N);
  }
  await writeLeaderboardCache({ ...cache, entries });
}

/**
 * Top LEADERBOARD_TOP_N opted-in users. Served from the cache for 30 minutes;
 * `force` (pull-to-refresh) refetches, but at most once a minute.
 */
export async function fetchLeaderboard(options: { force?: boolean } = {}): Promise<LeaderboardEntry[]> {
  if (isDemo()) return DEMO_LEADERBOARD.slice(0, LEADERBOARD_TOP_N);
  const cache = await readLeaderboardCache();
  const now = Date.now();
  const fresh = !!cache && now - cache.fetchedAt < LEADERBOARD_TTL_MS;
  const throttled = now - lastForcedAt < FORCED_REFRESH_MIN_MS;
  if (cache && (options.force ? throttled : fresh)) return cache.entries;
  if (!isFirebaseConfigured || !db) return cache?.entries ?? [];
  if (options.force) lastForcedAt = now;
  try {
    const snap = await getDocs(
      query(collection(db, "leaderboard"), orderBy("xp", "desc"), limit(LEADERBOARD_TOP_N))
    );
    const entries = snap.docs.map((d) => toCachedEntry(d.data() as LeaderboardEntry));
    await writeLeaderboardCache({ entries, fetchedAt: now });
    return entries;
  } catch (err) {
    if (__DEV__) console.warn("fetchLeaderboard failed:", err);
    return cache?.entries ?? [];
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
  lastForcedAt = 0;
  // The cached list may hold this user's own (now stale or deleted) row.
  void writeLeaderboardCache(null);
}
