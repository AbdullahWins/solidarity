import { useEffect, useRef, useState } from "react";
import { AppState } from "react-native";

import {
  flushSync,
  markDirty,
  pullSummary,
  pushSummary,
  toCloudSummary,
  type CloudUserSummary,
} from "../lib/cloudSync";
import { useAuth } from "../contexts/AuthContext";
import type { GamificationState, ScanRecord } from "../lib/types";
import { mergeMyVotesFromCloud } from "../lib/votes";

export function useCloudSync(scans: ScanRecord[], gamification: GamificationState) {
  const { user, isFirebaseConfigured, emailVerified } = useAuth();
  const [cloudSummary, setCloudSummary] = useState<CloudUserSummary | null>(null);
  const [mergeNotice, setMergeNotice] = useState<string | null>(null);
  const [leaderboardOptIn, setLeaderboardOptIn] = useState(false);
  const hasPulledForUid = useRef<string | null>(null);

  // Pull cloud state once per sign-in and decide whether to surface it.
  useEffect(() => {
    if (!user || hasPulledForUid.current === user.uid) return;
    hasPulledForUid.current = user.uid;

    (async () => {
      const cloud = await pullSummary(user.uid);
      if (!cloud) return;

      setCloudSummary(cloud);
      setLeaderboardOptIn(cloud.leaderboardOptIn ?? false);
      void mergeMyVotesFromCloud(cloud.myVotes);

      if (cloud.xp > gamification.xp) {
        setMergeNotice(
          `Cloud backup has more progress (Level ${cloud.level}, ${cloud.xp} XP) than this device. Showing cloud stats until you scan again here.`
        );
      }
    })();
  }, [user, gamification.xp]);

  // Push a debounced update whenever local scan-derived state changes.
  useEffect(() => {
    if (!user || !isFirebaseConfigured || scans.length === 0) return;
    const optIn = leaderboardOptIn && emailVerified;
    markDirty(async () => {
      const summary = toCloudSummary(
        user.uid,
        user.displayName ?? "Scanner",
        optIn,
        scans,
        gamification
      );
      await pushSummary(summary);
      setCloudSummary(summary);
    });
  }, [user, isFirebaseConfigured, scans, gamification, leaderboardOptIn, emailVerified]);

  // Flush any pending sync when the app is backgrounded.
  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "background" || state === "inactive") {
        void flushSync();
      }
    });
    return () => sub.remove();
  }, []);

  const setOptIn = (value: boolean) => {
    const effectiveValue = value && emailVerified;
    setLeaderboardOptIn(effectiveValue);
    if (!user) return;
    markDirty(async () => {
      const summary = toCloudSummary(
        user.uid,
        user.displayName ?? "Scanner",
        effectiveValue,
        scans,
        gamification
      );
      await pushSummary(summary);
      setCloudSummary(summary);
    });
  };

  const displayGamification =
    cloudSummary && cloudSummary.xp > gamification.xp
      ? {
          xp: cloudSummary.xp,
          level: cloudSummary.level,
          currentStreak: cloudSummary.currentStreak,
          longestStreak: cloudSummary.longestStreak,
        }
      : null;

  return { cloudSummary, mergeNotice, leaderboardOptIn, setOptIn, displayGamification };
}
