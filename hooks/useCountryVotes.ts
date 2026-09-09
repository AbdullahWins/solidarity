import { useCallback, useEffect, useState } from "react";

import { useAuth } from "../contexts/AuthContext";
import {
  castVote as castVoteRequest,
  getAllTallies,
  getCachedMyVotes,
  normalizeCountryKey,
  verdictFromTally,
  type CountryTally,
  type VoteChoice,
} from "../lib/votes";
import { awardVoteXp } from "../lib/voteGamification";
import type { GamificationState, ScanRecord } from "../lib/types";

export type CastVoteOutcome =
  | { ok: true; isFirstVote: boolean; leveledUp: boolean; level: number; xp: number }
  | { ok: false; reason: "signed-out" | "unverified" | "error" };

export function useCountryVotes(
  scans: ScanRecord[],
  gamification: GamificationState,
  onGamificationChange: (next: GamificationState) => void
) {
  const { user, emailVerified } = useAuth();
  const [tallies, setTallies] = useState<Record<string, CountryTally>>({});
  const [myVotes, setMyVotes] = useState<Record<string, VoteChoice>>(getCachedMyVotes());
  const [loadingTallies, setLoadingTallies] = useState(true);

  useEffect(() => {
    (async () => {
      const result = await getAllTallies();
      setTallies(result);
      setLoadingTallies(false);
    })();
  }, []);

  const getTally = useCallback(
    (country: string): CountryTally | undefined => tallies[normalizeCountryKey(country)],
    [tallies]
  );

  const getVerdict = useCallback(
    (country: string): boolean => verdictFromTally(getTally(country)),
    [getTally]
  );

  const myVote = useCallback(
    (country: string): VoteChoice | undefined => myVotes[normalizeCountryKey(country)],
    [myVotes]
  );

  const castVote = useCallback(
    async (country: string, choice: VoteChoice): Promise<CastVoteOutcome> => {
      if (!user) return { ok: false, reason: "signed-out" };
      if (!emailVerified) return { ok: false, reason: "unverified" };

      const result = await castVoteRequest(user.uid, country, choice);
      if (!result) return { ok: false, reason: "error" };

      const key = normalizeCountryKey(country);
      setTallies((current) => ({ ...current, [key]: result.tally }));
      setMyVotes((current) => ({ ...current, [key]: choice }));

      let leveledUp = false;
      let nextGamification = gamification;
      if (result.isFirstVote) {
        const awarded = await awardVoteXp(gamification, scans);
        leveledUp = awarded.leveledUp;
        nextGamification = awarded.state;
        onGamificationChange(awarded.state);
      }

      return {
        ok: true,
        isFirstVote: result.isFirstVote,
        leveledUp,
        level: nextGamification.level,
        xp: nextGamification.xp,
      };
    },
    [user, emailVerified, gamification, scans, onGamificationChange]
  );

  return { tallies, loadingTallies, getTally, getVerdict, myVote, castVote };
}
