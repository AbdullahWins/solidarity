/**
 * Byte-for-byte copies of the vote transactions shipped in app 1.1.0 (and
 * earlier), which only know about per-country tally docs. New rules must keep
 * accepting exactly these writes, because old installs stay around for months.
 */
import {
  doc,
  runTransaction,
  serverTimestamp,
  type Firestore,
} from "firebase/firestore";

type StoredChoice = "up" | "down" | "none";
type Tally = { country: string; upvotes: number; downvotes: number };

export async function legacyCastVote(db: Firestore, uid: string, key: string, country: string, choice: "up" | "down") {
  const tallyRef = doc(db, "countryTallies", key);
  const voterRef = doc(db, "countryVotes", key, "voters", uid);
  return runTransaction(db, async (tx) => {
    const [tallySnap, voterSnap] = await Promise.all([tx.get(tallyRef), tx.get(voterRef)]);
    const current: Tally = tallySnap.exists() ? (tallySnap.data() as Tally) : { country, upvotes: 0, downvotes: 0 };
    const previousChoice: StoredChoice | null = voterSnap.exists() ? (voterSnap.data().choice as StoredChoice) : null;
    let { upvotes, downvotes } = current;
    if (previousChoice === "up") upvotes -= 1;
    if (previousChoice === "down") downvotes -= 1;
    if (choice === "up") upvotes += 1;
    if (choice === "down") downvotes += 1;
    upvotes = Math.max(0, upvotes);
    downvotes = Math.max(0, downvotes);
    tx.set(tallyRef, { country, upvotes, downvotes, updatedAt: serverTimestamp() }, { merge: true });
    tx.set(voterRef, { choice, updatedAt: serverTimestamp() });
  });
}

export async function legacyRetractVote(db: Firestore, uid: string, key: string, country: string) {
  const tallyRef = doc(db, "countryTallies", key);
  const voterRef = doc(db, "countryVotes", key, "voters", uid);
  return runTransaction(db, async (tx) => {
    const [tallySnap, voterSnap] = await Promise.all([tx.get(tallyRef), tx.get(voterRef)]);
    if (!voterSnap.exists()) return;
    const previousChoice = voterSnap.data().choice as StoredChoice;
    if (previousChoice === "none") return;
    const current: Tally = tallySnap.exists() ? (tallySnap.data() as Tally) : { country, upvotes: 0, downvotes: 0 };
    let { upvotes, downvotes } = current;
    if (previousChoice === "up") upvotes = Math.max(0, upvotes - 1);
    if (previousChoice === "down") downvotes = Math.max(0, downvotes - 1);
    tx.set(tallyRef, { country, upvotes, downvotes, updatedAt: serverTimestamp() }, { merge: true });
    tx.set(voterRef, { choice: "none", updatedAt: serverTimestamp() });
  });
}

/** The per-country step of the 1.1.0 account-deletion flow. */
export async function legacyDeleteVote(db: Firestore, uid: string, key: string, country: string) {
  const tallyRef = doc(db, "countryTallies", key);
  const voterRef = doc(db, "countryVotes", key, "voters", uid);
  return runTransaction(db, async (tx) => {
    const [tallySnap, voterSnap] = await Promise.all([tx.get(tallyRef), tx.get(voterRef)]);
    if (!voterSnap.exists()) return;
    const choice = voterSnap.data().choice as StoredChoice;
    if (tallySnap.exists() && (choice === "up" || choice === "down")) {
      const current = tallySnap.data() as Tally;
      const upvotes = Math.max(0, current.upvotes - (choice === "up" ? 1 : 0));
      const downvotes = Math.max(0, current.downvotes - (choice === "down" ? 1 : 0));
      tx.set(tallyRef, { country: current.country ?? country, upvotes, downvotes, updatedAt: serverTimestamp() });
    }
    tx.delete(voterRef);
  });
}
