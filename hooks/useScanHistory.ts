import { useCallback, useEffect, useMemo, useState } from "react";

import { computeGamificationState, computeScanStats } from "../lib/gamification";
import {
  addScan as persistScan,
  clearGamificationState,
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

  useEffect(() => {
    (async () => {
      const [storedScans, storedGamification] = await Promise.all([
        getScans(),
        getGamificationState(),
      ]);
      setScans(storedScans);
      setGamification(storedGamification);
      setLoading(false);
    })();
  }, []);

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
    await clearGamificationState();
    setScans([]);
    setGamification(DEFAULT_GAMIFICATION_STATE);
  }, []);

  const stats = useMemo(() => computeScanStats(scans), [scans]);

  return { scans, gamification, stats, addScan, clearHistory, loading };
}
