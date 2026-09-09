import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useMemo, useState } from "react";

import { computeGamificationState, computeScanStats } from "../lib/gamification";
import {
  addScan as persistScan,
  clearScans,
  generateScanId,
  getGamificationState,
  getScans,
  saveGamificationState,
} from "../lib/storage";
import { DEFAULT_GAMIFICATION_STATE, type GamificationState, type ScanRecord } from "../lib/types";

export function useScanHistory() {
  const [scans, setScans] = useState<ScanRecord[]>([]);
  const [gamification, setGamification] = useState<GamificationState>(
    DEFAULT_GAMIFICATION_STATE
  );
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    const [storedScans, storedGamification] = await Promise.all([
      getScans(),
      getGamificationState(),
    ]);
    setScans(storedScans);
    setGamification(storedGamification);
    setLoading(false);
  }, []);

  // Reload on every focus, not just mount — expo-router keeps tab screens
  // mounted after their first visit, so a screen you were already on
  // wouldn't otherwise see scans/gamification changes made from another tab
  // (e.g. voting XP applied while on the Community tab, or a scan taken
  // after Stats was already mounted).
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        const [storedScans, storedGamification] = await Promise.all([
          getScans(),
          getGamificationState(),
        ]);
        if (cancelled) return;
        setScans(storedScans);
        setGamification(storedGamification);
        setLoading(false);
      })();
      return () => {
        cancelled = true;
      };
    }, [])
  );

  const addScan = useCallback(
    async (input: {
      code: string;
      country: string;
      isPositive: boolean;
      source: "camera" | "manual";
    }) => {
      const record: ScanRecord = {
        id: generateScanId(),
        code: input.code,
        country: input.country,
        isPositive: input.isPositive,
        source: input.source,
        scannedAt: new Date().toISOString(),
      };

      const nextScans = await persistScan(record);
      setScans(nextScans);

      const previousGamification = gamification;
      const nextGamification = computeGamificationState(nextScans, previousGamification);
      await saveGamificationState(nextGamification);
      setGamification(nextGamification);

      const newlyUnlockedBadgeIds = nextGamification.unlockedBadgeIds.filter(
        (id) => !previousGamification.unlockedBadgeIds.includes(id)
      );
      const leveledUp = nextGamification.level > previousGamification.level;

      return { record, gamification: nextGamification, newlyUnlockedBadgeIds, leveledUp };
    },
    [gamification]
  );

  const clearHistory = useCallback(async () => {
    await clearScans();
    // Recompute (don't hard-reset) gamification: computeGamificationState
    // carries voteXp/voteCount forward from the previous state, so clearing
    // your scan history correctly zeroes out scan-derived XP/streaks/badges
    // without also erasing XP and badges you earned from voting, which has
    // nothing to do with scans.
    const nextGamification = computeGamificationState([], gamification);
    await saveGamificationState(nextGamification);
    setScans([]);
    setGamification(nextGamification);
  }, [gamification]);

  const stats = useMemo(() => computeScanStats(scans), [scans]);

  // Exposed so external flows that mutate GamificationState directly (e.g.
  // vote-driven XP in lib/voteGamification.ts, which persists via
  // saveGamificationState itself) can keep this hook's React state in sync
  // without re-deriving it from scans.
  const applyGamificationState = useCallback((next: GamificationState) => {
    setGamification(next);
  }, []);

  return {
    scans,
    gamification,
    stats,
    addScan,
    clearHistory,
    loading,
    applyGamificationState,
    reload,
  };
}
