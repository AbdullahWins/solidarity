import { useCallback, useEffect, useSyncExternalStore } from "react";
import { AppState } from "react-native";

import { useAuth } from "../contexts/AuthContext";
import {
  flushSync,
  markDirty,
  pullSummary,
  pushSummary,
  toCloudSummary,
  type CloudUserSummary,
} from "../lib/cloudSync";
import type { GamificationState, ScanRecord } from "../lib/types";
import { mergeMyVotesFromCloud } from "../lib/votes";

// One shared store for every screen that uses this hook. Previously each
// screen kept its own opt-in flag, so a stale copy on the Scan tab could push
// leaderboardOptIn=false right after the user opted in on Profile, and the
// first push after launch could run before the cloud copy had been read.
type SyncState = {
  uid: string | null;
  /** True once the cloud copy for `uid` has been read (or found missing). */
  pulled: boolean;
  cloudSummary: CloudUserSummary | null;
  leaderboardOptIn: boolean;
};

let state: SyncState = { uid: null, pulled: false, cloudSummary: null, leaderboardOptIn: false };
const listeners = new Set<() => void>();
const setState = (patch: Partial<SyncState>) => {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
};
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
const getSnapshot = () => state;

let pullInFlight: Promise<void> | null = null;

async function pull(uid: string) {
  if (pullInFlight) return pullInFlight;
  pullInFlight = (async () => {
    const cloud = await pullSummary(uid);
    if (state.uid !== uid) return; // signed out / switched while loading
    if (cloud) void mergeMyVotesFromCloud(cloud.myVotes);
    setState({ pulled: true, cloudSummary: cloud, leaderboardOptIn: cloud?.leaderboardOptIn ?? false });
  })().finally(() => {
    pullInFlight = null;
  });
  return pullInFlight;
}

// Flush pending work whenever the app is backgrounded. Registered once for
// the app's lifetime, independent of which screens are mounted.
AppState.addEventListener("change", (s) => {
  if (s === "background" || s === "inactive") void flushSync();
});

export function useCloudSync(scans: ScanRecord[], gamification: GamificationState) {
  const { user, isFirebaseConfigured, emailVerified } = useAuth();
  const sync = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  // Track the signed-in user and read their cloud copy once per sign-in.
  useEffect(() => {
    const uid = user?.uid ?? null;
    if (state.uid === uid) return;
    setState({ uid, pulled: false, cloudSummary: null, leaderboardOptIn: false });
    if (uid) void pull(uid);
  }, [user?.uid]);

  // Debounced push whenever local progress changes, but never before the
  // cloud copy has been read (otherwise it would overwrite the opt-in flag).
  useEffect(() => {
    if (!user || !isFirebaseConfigured || !sync.pulled || sync.uid !== user.uid) return;
    if (scans.length === 0 && gamification.voteCount === 0) return;
    const optIn = sync.leaderboardOptIn && emailVerified;
    markDirty(async () => {
      const summary = toCloudSummary(user.uid, user.displayName ?? "", optIn, scans, gamification);
      if (await pushSummary(summary)) setState({ cloudSummary: summary });
    });
  }, [user, isFirebaseConfigured, sync.pulled, sync.uid, sync.leaderboardOptIn, scans, gamification, emailVerified]);

  const setOptIn = useCallback(
    (value: boolean) => {
      if (!user) return;
      const effectiveValue = value && emailVerified;
      const previous = state.leaderboardOptIn;
      setState({ leaderboardOptIn: effectiveValue });
      // User-initiated: push now (not via the debounce) and remove the public
      // row on opt-out.
      (async () => {
        const summary = toCloudSummary(user.uid, user.displayName ?? "", effectiveValue, scans, gamification);
        const ok = await pushSummary(summary, { removeFromLeaderboard: !effectiveValue });
        if (ok) setState({ cloudSummary: summary });
        else setState({ leaderboardOptIn: previous });
      })();
    },
    [user, emailVerified, scans, gamification]
  );

  const refreshCloud = useCallback(async () => {
    if (user) {
      setState({ pulled: state.uid === user.uid && state.pulled });
      await pull(user.uid);
    }
  }, [user]);

  const cloud = sync.uid === user?.uid ? sync.cloudSummary : null;
  const cloudAhead = !!cloud && cloud.xp > gamification.xp;
  const displayGamification = cloudAhead
    ? {
        xp: cloud.xp,
        level: cloud.level,
        currentStreak: cloud.currentStreak,
        longestStreak: cloud.longestStreak,
      }
    : null;

  return {
    cloudSummary: cloud,
    mergeNotice: cloudAhead
      ? `Your cloud backup has more progress (Level ${cloud.level}, ${cloud.xp} XP) than this device. Showing it until you scan here.`
      : null,
    leaderboardOptIn: sync.leaderboardOptIn,
    setOptIn,
    displayGamification,
    refreshCloud,
  };
}
