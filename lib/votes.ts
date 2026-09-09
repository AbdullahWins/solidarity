import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  collection,
  doc,
  getDocs,
  runTransaction,
  serverTimestamp,
  type Timestamp,
} from "firebase/firestore";

import { countryCodeMap } from "../constants/country-map";
import { db, isFirebaseConfigured } from "./firebase";

export type VoteChoice = "up" | "down";
// "none" is a tombstone written on retraction — the voter doc is kept (not
// deleted) so a user can't farm XP by retracting and re-voting on the same
// country (isFirstVote below checks doc *existence*, not the current choice).
type StoredChoice = VoteChoice | "none";

export type CountryTally = {
  country: string;
  upvotes: number;
  downvotes: number;
  updatedAt?: Timestamp;
};

// Non-country labels from constants/country-map.ts — these never get a
// tally doc and the vote UI is never shown for them.
const NON_VOTABLE_COUNTRIES = new Set([
  "reserved",
  "coupons",
  "usa drugs",
  "serial publications (issn)",
  "bookland (isbn)",
  "refund receipts",
  "coupon identification",
  "gs1 global office",
  "epc",
  "gs1 uk",
]);

export function normalizeCountryKey(country: string): string {
  return country
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function isVotableCountry(country: string | null | undefined): boolean {
  if (!country) return false;
  return !NON_VOTABLE_COUNTRIES.has(country.trim().toLowerCase());
}

// Unique, alphabetized list of every votable country/region name in
// constants/country-map.ts — used to populate the Community browse screen.
export function getVotableCountryNames(): string[] {
  const names = new Set(Object.values(countryCodeMap));
  return Array.from(names)
    .filter(isVotableCountry)
    .sort((a, b) => a.localeCompare(b));
}

export function verdictFromTally(tally: CountryTally | undefined | null): boolean {
  if (!tally) return true; // no votes yet — ties (including 0/0) go green
  return !(tally.downvotes > tally.upvotes);
}

const CACHE_KEY = "solidarity:v1:countryTalliesCache";
const CACHE_TTL_MS = 45 * 60 * 1000; // 45 minutes
const MY_VOTES_KEY = "solidarity:v1:myVotes";

// Local mirror of "what did I vote on each country" — lets the UI show the
// user's own vote state instantly (no Firestore read needed) and lets
// lib/cloudSync.ts piggyback it onto the existing users/{uid} doc push
// without any extra reads/writes of its own. Entries with choice "none"
// (retracted) are filtered out of what callers see via getCachedMyVotes.
let myVotesCache: Record<string, StoredChoice> = {};

export function getCachedMyVotes(): Record<string, VoteChoice> {
  const active: Record<string, VoteChoice> = {};
  for (const [key, choice] of Object.entries(myVotesCache)) {
    if (choice !== "none") active[key] = choice;
  }
  return active;
}

export async function loadMyVotes(): Promise<Record<string, VoteChoice>> {
  try {
    const raw = await AsyncStorage.getItem(MY_VOTES_KEY);
    myVotesCache = raw ? (JSON.parse(raw) as Record<string, StoredChoice>) : {};
  } catch {
    myVotesCache = {};
  }
  return getCachedMyVotes();
}

async function saveMyVote(key: string, choice: StoredChoice): Promise<void> {
  myVotesCache = { ...myVotesCache, [key]: choice };
  try {
    await AsyncStorage.setItem(MY_VOTES_KEY, JSON.stringify(myVotesCache));
  } catch {
    // best-effort only
  }
}

// Merges in vote choices pulled from the cloud (e.g. on sign-in on a new
// device) without discarding any newer local-only votes.
export async function mergeMyVotesFromCloud(
  cloudVotes: Record<string, VoteChoice> | undefined
): Promise<void> {
  if (!cloudVotes) return;
  myVotesCache = { ...cloudVotes, ...myVotesCache };
  try {
    await AsyncStorage.setItem(MY_VOTES_KEY, JSON.stringify(myVotesCache));
  } catch {
    // best-effort only
  }
}

let memoryCache: { tallies: Record<string, CountryTally>; fetchedAt: number } | null = null;

type PersistedCache = { tallies: Record<string, CountryTally>; fetchedAt: number };

async function readPersistedCache(): Promise<PersistedCache | null> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PersistedCache;
  } catch {
    return null;
  }
}

async function writePersistedCache(cache: PersistedCache): Promise<void> {
  try {
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {
    // best-effort only
  }
}

// Updates BOTH the in-memory and AsyncStorage-persisted tally caches after a
// vote is cast/retracted. Previously only the in-memory cache was updated,
// which meant a JS context reload (common in Expo Go, or any fast refresh
// that resets module state) would fall back to the on-disk cache — still
// "fresh" by TTL, but missing the vote — and silently show reverted data
// for up to CACHE_TTL_MS even though Firestore itself was correct.
async function updateTallyCache(key: string, tally: CountryTally): Promise<void> {
  const now = Date.now();
  memoryCache = memoryCache
    ? { tallies: { ...memoryCache.tallies, [key]: tally }, fetchedAt: memoryCache.fetchedAt }
    : { tallies: { [key]: tally }, fetchedAt: now };
  await writePersistedCache(memoryCache);
}

export async function getAllTallies(
  force = false
): Promise<Record<string, CountryTally>> {
  const now = Date.now();

  if (!force && memoryCache && now - memoryCache.fetchedAt < CACHE_TTL_MS) {
    return memoryCache.tallies;
  }

  if (!force && !memoryCache) {
    const persisted = await readPersistedCache();
    if (persisted && now - persisted.fetchedAt < CACHE_TTL_MS) {
      memoryCache = persisted;
      return persisted.tallies;
    }
    // keep a stale persisted copy around as a fallback below
    if (persisted) memoryCache = persisted;
  }

  if (!isFirebaseConfigured || !db) {
    return memoryCache?.tallies ?? {};
  }

  try {
    const snap = await getDocs(collection(db, "countryTallies"));
    const tallies: Record<string, CountryTally> = {};
    snap.forEach((docSnap) => {
      tallies[docSnap.id] = docSnap.data() as CountryTally;
    });
    const fresh = { tallies, fetchedAt: now };
    memoryCache = fresh;
    void writePersistedCache(fresh);
    return tallies;
  } catch {
    // network blip — never blank out colors, fall back to whatever we have
    return memoryCache?.tallies ?? {};
  }
}

export type CastVoteResult = {
  tally: CountryTally;
  isFirstVote: boolean;
};

export async function castVote(
  uid: string,
  country: string,
  choice: VoteChoice
): Promise<CastVoteResult | null> {
  if (!isFirebaseConfigured || !db) return null;

  const key = normalizeCountryKey(country);
  const tallyRef = doc(db, "countryTallies", key);
  const voterRef = doc(db, "countryVotes", key, "voters", uid);

  try {
    const result = await runTransaction(db, async (tx) => {
      const [tallySnap, voterSnap] = await Promise.all([tx.get(tallyRef), tx.get(voterRef)]);

      const current: CountryTally = tallySnap.exists()
        ? (tallySnap.data() as CountryTally)
        : { country, upvotes: 0, downvotes: 0 };

      const previousChoice: StoredChoice | null = voterSnap.exists()
        ? (voterSnap.data().choice as StoredChoice)
        : null;

      let { upvotes, downvotes } = current;
      if (previousChoice === "up") upvotes -= 1;
      if (previousChoice === "down") downvotes -= 1;
      if (choice === "up") upvotes += 1;
      if (choice === "down") downvotes += 1;
      upvotes = Math.max(0, upvotes);
      downvotes = Math.max(0, downvotes);

      const nextTally: CountryTally = { country, upvotes, downvotes };
      tx.set(tallyRef, { ...nextTally, updatedAt: serverTimestamp() }, { merge: true });
      tx.set(voterRef, { choice, updatedAt: serverTimestamp() });

      // isFirstVote is about the voter DOC ever having existed, not the
      // current choice — a retracted-then-recast vote must not re-earn XP.
      return { tally: nextTally, isFirstVote: !voterSnap.exists() };
    });

    // keep the local caches (memory + persisted) in step with what we just wrote
    await updateTallyCache(key, result.tally);
    await saveMyVote(key, choice);

    return result;
  } catch {
    return null;
  }
}

// Removes the user's current vote from the tally without erasing the fact
// that they've voted before (see StoredChoice "none" tombstone above) —
// prevents retract-then-recast XP farming while still freeing up their
// up/down slot.
export async function retractVote(uid: string, country: string): Promise<CountryTally | null> {
  if (!isFirebaseConfigured || !db) return null;

  const key = normalizeCountryKey(country);
  const tallyRef = doc(db, "countryTallies", key);
  const voterRef = doc(db, "countryVotes", key, "voters", uid);

  try {
    const nextTally = await runTransaction(db, async (tx) => {
      const [tallySnap, voterSnap] = await Promise.all([tx.get(tallyRef), tx.get(voterRef)]);
      if (!voterSnap.exists()) return null;

      const previousChoice = voterSnap.data().choice as StoredChoice;
      if (previousChoice === "none") return null; // already retracted, nothing to do

      const current: CountryTally = tallySnap.exists()
        ? (tallySnap.data() as CountryTally)
        : { country, upvotes: 0, downvotes: 0 };

      let { upvotes, downvotes } = current;
      if (previousChoice === "up") upvotes = Math.max(0, upvotes - 1);
      if (previousChoice === "down") downvotes = Math.max(0, downvotes - 1);

      const updatedTally: CountryTally = { country, upvotes, downvotes };
      tx.set(tallyRef, { ...updatedTally, updatedAt: serverTimestamp() }, { merge: true });
      tx.set(voterRef, { choice: "none", updatedAt: serverTimestamp() });

      return updatedTally;
    });

    if (!nextTally) return null;

    await updateTallyCache(key, nextTally);
    await saveMyVote(key, "none");

    return nextTally;
  } catch {
    return null;
  }
}
