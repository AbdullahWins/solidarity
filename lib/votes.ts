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
// without any extra reads/writes of its own.
let myVotesCache: Record<string, VoteChoice> = {};

export function getCachedMyVotes(): Record<string, VoteChoice> {
  return myVotesCache;
}

export async function loadMyVotes(): Promise<Record<string, VoteChoice>> {
  try {
    const raw = await AsyncStorage.getItem(MY_VOTES_KEY);
    myVotesCache = raw ? (JSON.parse(raw) as Record<string, VoteChoice>) : {};
  } catch {
    myVotesCache = {};
  }
  return myVotesCache;
}

async function saveMyVote(key: string, choice: VoteChoice): Promise<void> {
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

      const previousChoice: VoteChoice | null = voterSnap.exists()
        ? (voterSnap.data().choice as VoteChoice)
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

      return { tally: nextTally, isFirstVote: previousChoice === null };
    });

    // keep the local caches in step with what we just wrote
    if (memoryCache) {
      memoryCache.tallies[key] = result.tally;
    }
    await saveMyVote(key, choice);

    return result;
  } catch {
    return null;
  }
}
