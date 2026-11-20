import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";

import { useAuth } from "../contexts/AuthContext";
import { fetchLeaderboard, type LeaderboardEntry } from "../lib/cloudSync";

/**
 * Leaderboard data, loaded only while `enabled` (e.g. its segment is visible)
 * so ordinary Community visits spend no reads. Served from the 30-minute cache;
 * `refresh()` forces a fetch (throttled to once a minute in lib/cloudSync).
 */
export function useLeaderboard(enabled: boolean) {
  const { loading: authLoading } = useAuth();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      // Wait for auth to restore so a real fetch carries the session.
      if (!enabled || authLoading) return;
      let cancelled = false;
      (async () => {
        const data = await fetchLeaderboard();
        if (cancelled) return;
        setEntries(data);
        setLoading(false);
      })();
      return () => {
        cancelled = true;
      };
    }, [enabled, authLoading])
  );

  const refresh = useCallback(async () => {
    setEntries(await fetchLeaderboard({ force: true }));
    setLoading(false);
  }, []);

  return { entries, loading, refresh };
}
