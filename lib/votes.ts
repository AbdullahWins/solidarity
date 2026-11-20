import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  collection,
  doc,
  FieldPath,
  getDoc,
  getDocs,
  runTransaction,
  serverTimestamp,
  updateDoc,
  type DocumentReference,
  type Firestore,
  type Timestamp,
  type Transaction,
} from "firebase/firestore";

import { countryCodeMap } from "../constants/country-map";
import { auth, db, isFirebaseConfigured } from "./firebase";

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
  "unknown",
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
const CACHE_TTL_MS = 3 * 60 * 60 * 1000; // 3 hours; your own votes update the cache immediately
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

// --- Aggregate tallies --------------------------------------------------
// Every country's counts are mirrored into aggregates/countryTallies so a
// fetch costs 1 read instead of ~110. The per-country docs stay the source of
// truth (older app versions only write those), and Firestore rules only
// accept aggregate entries that equal their per-country doc. Once a day, one
// verified client re-reads the per-country docs and repairs drifted entries.

type Aggregate = { tallies?: Record<string, CountryTally>; syncedAt?: Timestamp };

const RECONCILE_AFTER_MS = 24 * 60 * 60 * 1000;
// Rules allow a claim once the last one is 23h old; the extra hour on the
// read side absorbs client clock skew.
const CLAIM_AFTER_MS = 23 * 60 * 60 * 1000;

const aggregateRef = (firestore: Firestore) => doc(firestore, "aggregates", "countryTallies");

const isStale = (data: Aggregate | null, afterMs: number) =>
  !data?.syncedAt || Date.now() - data.syncedAt.toMillis() > afterMs;

const sameCounts = (a: CountryTally | undefined, b: CountryTally) =>
  !!a && a.upvotes === b.upvotes && a.downvotes === b.downvotes;

const entryOf = (key: string, t: CountryTally) => ({
  country: t.country ?? key,
  upvotes: t.upvotes,
  downvotes: t.downvotes,
});

async function readAllCountryTallies(firestore: Firestore): Promise<Record<string, CountryTally>> {
  const snap = await getDocs(collection(firestore, "countryTallies"));
  const tallies: Record<string, CountryTally> = {};
  snap.forEach((docSnap) => {
    const t = docSnap.data() as CountryTally;
    if (typeof t.upvotes === "number" && typeof t.downvotes === "number") {
      tallies[docSnap.id] = entryOf(docSnap.id, t);
    }
  });
  return tallies;
}

function mirrorEntry(tx: Transaction, ref: DocumentReference, key: string, tally: CountryTally) {
  tx.update(ref, new FieldPath("tallies", key), entryOf(key, tally), "changedKey", key, "updatedAt", serverTimestamp());
}

/** Claims the daily reconcile for this client, or returns null if it can't or someone else has it. */
async function claimReconcile(firestore: Firestore): Promise<Aggregate | null> {
  if (!auth?.currentUser?.emailVerified) return null;
  const ref = aggregateRef(firestore);
  try {
    return await runTransaction(firestore, async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists()) {
        tx.set(ref, { tallies: {}, syncedAt: serverTimestamp() });
        return { tallies: {} };
      }
      const data = snap.data() as Aggregate;
      if (!isStale(data, CLAIM_AFTER_MS)) return null;
      tx.update(ref, { syncedAt: serverTimestamp() });
      return data;
    });
  } catch {
    return null;
  }
}

/** Copies each drifted per-country tally into the aggregate, one key per write. */
async function repairAggregate(
  firestore: Firestore,
  current: Record<string, CountryTally>,
  truth: Record<string, CountryTally>
): Promise<void> {
  const ref = aggregateRef(firestore);
  for (const [key, tally] of Object.entries(truth)) {
    if (sameCounts(current[key], tally)) continue;
    try {
      await updateDoc(ref, new FieldPath("tallies", key), entryOf(key, tally), "changedKey", key, "updatedAt", serverTimestamp());
    } catch {
      // A vote on this country raced us; the next reconcile picks it up.
    }
  }
}

let pendingRepair: Promise<void> = Promise.resolve();
/** Resolves once any background reconcile writes have finished (tests). */
export const whenRepaired = () => pendingRepair;

async function fetchTallies(firestore: Firestore): Promise<Record<string, CountryTally>> {
  const snap = await getDoc(aggregateRef(firestore));
  const data = snap.exists() ? (snap.data() as Aggregate) : null;
  if (data && !isStale(data, RECONCILE_AFTER_MS)) return data.tallies ?? {};

  const claimed = await claimReconcile(firestore);
  if (claimed) {
    const truth = await readAllCountryTallies(firestore);
    pendingRepair = repairAggregate(firestore, claimed.tallies ?? {}, truth);
    return truth;
  }
  // Stale, but another client is reconciling (or none can): still usable.
  if (data) return data.tallies ?? {};
  // No aggregate yet and this client can't create it.
  return readAllCountryTallies(firestore);
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
    const tallies = await fetchTallies(db);
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
    const aggRef = aggregateRef(db);
    const result = await runTransaction(db, async (tx) => {
      const [tallySnap, voterSnap, aggSnap] = await Promise.all([tx.get(tallyRef), tx.get(voterRef), tx.get(aggRef)]);

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
      // No aggregate yet: the reconcile will add this country.
      if (aggSnap.exists()) mirrorEntry(tx, aggRef, key, nextTally);

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
    const aggRef = aggregateRef(db);
    const nextTally = await runTransaction(db, async (tx) => {
      const [tallySnap, voterSnap, aggSnap] = await Promise.all([tx.get(tallyRef), tx.get(voterRef), tx.get(aggRef)]);
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
      if (aggSnap.exists()) mirrorEntry(tx, aggRef, key, updatedTally);

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

/** Forget this device's record of the signed-in user's votes (sign-out). */
export async function clearMyVotes(): Promise<void> {
  myVotesCache = {};
  try {
    await AsyncStorage.removeItem(MY_VOTES_KEY);
  } catch {
    // best-effort only
  }
}

/**
 * Account deletion: removes every vote this user ever cast. Active votes are
 * subtracted from the public tally, and the per-user voter docs (including
 * "none" tombstones) are deleted, so nothing keyed by the uid is left behind.
 *
 * Checks every votable country rather than the local cache, because votes may
 * have been cast from another device. ~110 single-doc reads, once.
 */
export async function deleteAllVotesForUser(uid: string): Promise<void> {
  if (!isFirebaseConfigured || !db) return;
  const firestore = db;
  const countries = getVotableCountryNames();

  const existing: string[] = [];
  const BATCH = 20;
  for (let i = 0; i < countries.length; i += BATCH) {
    const slice = countries.slice(i, i + BATCH);
    const snaps = await Promise.all(
      slice.map((country) => getDoc(doc(firestore, "countryVotes", normalizeCountryKey(country), "voters", uid)))
    );
    snaps.forEach((snap, idx) => {
      if (snap.exists()) existing.push(slice[idx]);
    });
  }

  for (const country of existing) {
    const key = normalizeCountryKey(country);
    const tallyRef = doc(firestore, "countryTallies", key);
    const voterRef = doc(firestore, "countryVotes", key, "voters", uid);
    const aggRef = aggregateRef(firestore);
    await runTransaction(firestore, async (tx) => {
      const [tallySnap, voterSnap, aggSnap] = await Promise.all([tx.get(tallyRef), tx.get(voterRef), tx.get(aggRef)]);
      if (!voterSnap.exists()) return;
      const choice = voterSnap.data().choice as StoredChoice;
      if (tallySnap.exists() && (choice === "up" || choice === "down")) {
        const current = tallySnap.data() as CountryTally;
        const upvotes = Math.max(0, current.upvotes - (choice === "up" ? 1 : 0));
        const downvotes = Math.max(0, current.downvotes - (choice === "down" ? 1 : 0));
        const nextTally = { country: current.country ?? country, upvotes, downvotes };
        tx.set(tallyRef, { ...nextTally, updatedAt: serverTimestamp() });
        if (aggSnap.exists()) mirrorEntry(tx, aggRef, key, nextTally);
        if (memoryCache) {
          memoryCache.tallies[key] = { country: current.country ?? country, upvotes, downvotes };
        }
      }
      tx.delete(voterRef);
    });
  }

  if (memoryCache) await writePersistedCache(memoryCache);
  await clearMyVotes();
}
