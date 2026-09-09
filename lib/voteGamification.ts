import { computeLevel, evaluateBadges, XP_PER_SCAN } from "./gamification";
import { saveGamificationState } from "./storage";
import type { GamificationState, ScanRecord } from "./types";

export type AwardVoteXpResult = {
  state: GamificationState;
  leveledUp: boolean;
};

// Awards XP for a user's FIRST vote on a given country (switching an
// existing vote never re-awards XP — callers only invoke this when
// castVote() reports isFirstVote: true). Kept deliberately parallel to
// computeGamificationState's scan-based recompute rather than folded into
// it, since votes are upsert state, not an immutable event to replay.
export async function awardVoteXp(
  prevGamification: GamificationState,
  scans: ScanRecord[]
): Promise<AwardVoteXpResult> {
  const xp = prevGamification.xp + XP_PER_SCAN;
  const level = computeLevel(xp);
  const leveledUp = level > prevGamification.level;

  const partialState: GamificationState = {
    ...prevGamification,
    xp,
    level,
    voteXp: prevGamification.voteXp + XP_PER_SCAN,
    voteCount: prevGamification.voteCount + 1,
  };

  const state: GamificationState = {
    ...partialState,
    ...evaluateBadges(scans, partialState, prevGamification),
  };

  await saveGamificationState(state);

  return { state, leveledUp };
}
