import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useState } from "react";

import { useAuth } from "../contexts/AuthContext";
import {
  castVote as castVoteRequest,
  getAllTallies,
  getCachedMyVotes,
  normalizeCountryKey,
  retractVote as retractVoteRequest,
  verdictFromTally,
  type CountryTally,
  type VoteChoice,
} from "../lib/votes";
import { awardVoteXp } from "../lib/voteGamification";
import type { GamificationState, ScanRecord } from "../lib/types";

export type CastVoteOutcome =
  | { ok: true; retracted: boolean; isFirstVote: boolean; leveledUp: boolean; level: number; xp: number }
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

  const reload = useCallback(async (force = false) => {
    const result = await getAllTallies(force);
    setTallies(result);
    setMyVotes(getCachedMyVotes());
    setLoadingTallies(false);
  }, []);

  // Reload on every focus, not just mount — other screens (or this same
  // screen's own castVote) may have updated the shared tally/myVotes caches
  // in lib/votes.ts since this component last rendered, and expo-router
  // keeps tab screens mounted across tab switches so a plain mount-only
  // effect would never pick that up.
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        const result = await getAllTallies();
        if (cancelled) return;
        setTallies(result);
        setMyVotes(getCachedMyVotes());
        setLoadingTallies(false);
      })();
      return () => {
        cancelled = true;
      };
    }, [])
  );

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

      const key = normalizeCountryKey(country);

      // Tapping your already-active choice again retracts it instead of
      // re-casting the same vote — this is how users remove a vote entirely.
      if (myVotes[key] === choice) {
        const tally = await retractVoteRequest(user.uid, country);
        if (!tally) return { ok: false, reason: "error" };

        setTallies((current) => ({ ...current, [key]: tally }));
        setMyVotes((current) => {
          const next = { ...current };
          delete next[key];
          return next;
        });

        return {
          ok: true,
          retracted: true,
          isFirstVote: false,
          leveledUp: false,
          level: gamification.level,
          xp: gamification.xp,
        };
      }

      const result = await castVoteRequest(user.uid, country, choice);
      if (!result) return { ok: false, reason: "error" };

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
        retracted: false,
        isFirstVote: result.isFirstVote,
        leveledUp,
        level: nextGamification.level,
        xp: nextGamification.xp,
      };
    },
    [user, emailVerified, gamification, scans, onGamificationChange, myVotes]
  );

  return { tallies, loadingTallies, getTally, getVerdict, myVote, castVote, reload };
}
