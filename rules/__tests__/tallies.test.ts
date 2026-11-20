/**
 * Tally integrity: counts move only by the caller's own vote, and the
 * aggregate doc only ever mirrors the authoritative per-country tallies.
 */
import { assertFails, assertSucceeds, type RulesTestEnvironment } from "@firebase/rules-unit-testing";
import {
  doc,
  FieldPath,
  getDoc,
  runTransaction,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  writeBatch,
  type Firestore,
} from "firebase/firestore";

import { createEnv, unverifiedDb, verifiedDb } from "./env";
import { legacyCastVote } from "./legacyClient";

let env: RulesTestEnvironment;

beforeAll(async () => {
  env = await createEnv();
});
afterAll(async () => {
  await env.cleanup();
});
beforeEach(async () => {
  await env.clearFirestore();
});

async function seed(path: string, data: Record<string, unknown>) {
  await env.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore() as never, path), data);
  });
}

const tally = (db: Firestore, key: string) => doc(db, "countryTallies", key);
const voter = (db: Firestore, key: string, uid: string) => doc(db, "countryVotes", key, "voters", uid);
const aggregate = (db: Firestore) => doc(db, "aggregates", "countryTallies");

describe("countryTallies", () => {
  test("rejects a count change larger than the caller's vote", async () => {
    const db = verifiedDb(env, "mallory");
    const batch = writeBatch(db);
    batch.set(tally(db, "germany"), { country: "Germany", upvotes: 0, downvotes: 500, updatedAt: serverTimestamp() });
    batch.set(voter(db, "germany", "mallory"), { choice: "down", updatedAt: serverTimestamp() });
    await assertFails(batch.commit());
  });

  test("rejects a count change without a voter write", async () => {
    await seed("countryTallies/germany", { country: "Germany", upvotes: 3, downvotes: 3 });
    const db = verifiedDb(env, "mallory");
    await assertFails(setDoc(tally(db, "germany"), { country: "Germany", upvotes: 3, downvotes: 4, updatedAt: serverTimestamp() }));
  });

  test("rejects a second up vote while one is already counted", async () => {
    const db = verifiedDb(env, "mallory");
    await legacyCastVote(db, "mallory", "germany", "Germany", "up");
    // Rewrite the same "up" voter doc but bump the tally again.
    const batch = writeBatch(db);
    batch.set(tally(db, "germany"), { country: "Germany", upvotes: 2, downvotes: 0, updatedAt: serverTimestamp() });
    batch.set(voter(db, "germany", "mallory"), { choice: "up", updatedAt: serverTimestamp() });
    await assertFails(batch.commit());
  });

  test("rejects unverified users", async () => {
    await assertFails(legacyCastVote(unverifiedDb(env, "eve"), "eve", "germany", "Germany", "up"));
  });
});

/** What a new client does in one transaction: voter + tally + aggregate. */
async function newClientVote(db: Firestore, uid: string, key: string, country: string, up: number, down: number) {
  await runTransaction(db, async (tx) => {
    await tx.get(aggregate(db));
    tx.set(tally(db, key), { country, upvotes: up, downvotes: down, updatedAt: serverTimestamp() }, { merge: true });
    tx.set(voter(db, key, uid), { choice: up ? "up" : "down", updatedAt: serverTimestamp() });
    tx.update(aggregate(db), new FieldPath("tallies", key), { country, upvotes: up, downvotes: down }, "changedKey", key, "updatedAt", serverTimestamp());
  });
}

describe("aggregates/countryTallies", () => {
  const fresh = () => Timestamp.fromMillis(Date.now() - 60 * 60 * 1000);
  const stale = () => Timestamp.fromMillis(Date.now() - 48 * 60 * 60 * 1000);

  test("anyone can read", async () => {
    await seed("aggregates/countryTallies", { tallies: {}, syncedAt: fresh() });
    await assertSucceeds(getDoc(aggregate(env.unauthenticatedContext().firestore() as never)));
  });

  test("a mirrored vote is allowed", async () => {
    await seed("aggregates/countryTallies", { tallies: {}, syncedAt: fresh() });
    await assertSucceeds(newClientVote(verifiedDb(env, "alice"), "alice", "germany", "Germany", 1, 0));
  });

  test("an entry that doesn't match the tally is denied", async () => {
    await seed("aggregates/countryTallies", { tallies: {}, syncedAt: fresh() });
    await seed("countryTallies/germany", { country: "Germany", upvotes: 2, downvotes: 1 });
    const db = verifiedDb(env, "mallory");
    await assertFails(
      updateDoc(aggregate(db), new FieldPath("tallies", "germany"), { country: "Germany", upvotes: 0, downvotes: 99 }, "changedKey", "germany", "updatedAt", serverTimestamp())
    );
  });

  test("a matching reconcile copy is allowed", async () => {
    await seed("aggregates/countryTallies", { tallies: {}, syncedAt: fresh() });
    await seed("countryTallies/germany", { country: "Germany", upvotes: 2, downvotes: 1 });
    const db = verifiedDb(env, "alice");
    await assertSucceeds(
      updateDoc(aggregate(db), new FieldPath("tallies", "germany"), { country: "Germany", upvotes: 2, downvotes: 1 }, "changedKey", "germany", "updatedAt", serverTimestamp())
    );
  });

  test("changing two countries at once is denied", async () => {
    await seed("aggregates/countryTallies", { tallies: {}, syncedAt: fresh() });
    await seed("countryTallies/germany", { country: "Germany", upvotes: 2, downvotes: 1 });
    await seed("countryTallies/france", { country: "France", upvotes: 1, downvotes: 0 });
    const db = verifiedDb(env, "mallory");
    await assertFails(
      updateDoc(
        aggregate(db),
        new FieldPath("tallies", "germany"), { country: "Germany", upvotes: 2, downvotes: 1 },
        new FieldPath("tallies", "france"), { country: "France", upvotes: 1, downvotes: 0 },
        "changedKey", "germany",
        "updatedAt", serverTimestamp()
      )
    );
  });

  test("creating requires empty tallies", async () => {
    const db = verifiedDb(env, "alice");
    await assertFails(setDoc(aggregate(db), { tallies: { germany: { country: "Germany", upvotes: 9, downvotes: 0 } }, syncedAt: serverTimestamp() }));
    await assertSucceeds(setDoc(aggregate(db), { tallies: {}, syncedAt: serverTimestamp() }));
  });

  test("the reconcile claim is denied within 23 hours", async () => {
    await seed("aggregates/countryTallies", { tallies: {}, syncedAt: fresh() });
    await assertFails(updateDoc(aggregate(verifiedDb(env, "alice")), { syncedAt: serverTimestamp() }));
  });

  test("the reconcile claim is allowed once stale", async () => {
    await seed("aggregates/countryTallies", { tallies: {}, syncedAt: stale() });
    await assertSucceeds(updateDoc(aggregate(verifiedDb(env, "alice")), { syncedAt: serverTimestamp() }));
  });

  test("a claim can't sneak in count changes", async () => {
    await seed("aggregates/countryTallies", { tallies: {}, syncedAt: stale() });
    await assertFails(
      updateDoc(aggregate(verifiedDb(env, "mallory")), {
        syncedAt: serverTimestamp(),
        tallies: { germany: { country: "Germany", upvotes: 0, downvotes: 99 } },
      })
    );
  });

  test("signed-out users can't write", async () => {
    await seed("aggregates/countryTallies", { tallies: {}, syncedAt: stale() });
    await assertFails(updateDoc(aggregate(env.unauthenticatedContext().firestore() as never), { syncedAt: serverTimestamp() }));
  });
});
