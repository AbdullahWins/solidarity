/**
 * Compatibility baseline: the vote flow of app 1.1.0 must keep working under
 * every future version of firestore.rules.
 */
import { assertSucceeds, type RulesTestEnvironment } from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc } from "firebase/firestore";

import { createEnv, verifiedDb } from "./env";
import { legacyCastVote, legacyDeleteVote, legacyRetractVote } from "./legacyClient";

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

async function counts(key: string) {
  let data: { upvotes: number; downvotes: number } | undefined;
  await env.withSecurityRulesDisabled(async (ctx) => {
    const snap = await getDoc(doc(ctx.firestore() as never, "countryTallies", key));
    data = snap.data() as typeof data;
  });
  return data ? { up: data.upvotes, down: data.downvotes } : null;
}

describe("app 1.1.0 vote flow", () => {
  test("cast, change, retract and re-cast", async () => {
    const db = verifiedDb(env, "alice");
    await assertSucceeds(legacyCastVote(db, "alice", "germany", "Germany", "up"));
    expect(await counts("germany")).toEqual({ up: 1, down: 0 });

    await assertSucceeds(legacyCastVote(db, "alice", "germany", "Germany", "down"));
    expect(await counts("germany")).toEqual({ up: 0, down: 1 });

    await assertSucceeds(legacyRetractVote(db, "alice", "germany", "Germany"));
    expect(await counts("germany")).toEqual({ up: 0, down: 0 });

    await assertSucceeds(legacyCastVote(db, "alice", "germany", "Germany", "up"));
    expect(await counts("germany")).toEqual({ up: 1, down: 0 });
  });

  test("two users accumulate", async () => {
    await assertSucceeds(legacyCastVote(verifiedDb(env, "alice"), "alice", "france", "France", "up"));
    await assertSucceeds(legacyCastVote(verifiedDb(env, "bob"), "bob", "france", "France", "up"));
    expect(await counts("france")).toEqual({ up: 2, down: 0 });
  });

  test("account deletion removes the vote", async () => {
    const db = verifiedDb(env, "alice");
    await legacyCastVote(db, "alice", "spain", "Spain", "down");
    await legacyCastVote(verifiedDb(env, "bob"), "bob", "spain", "Spain", "down");
    await assertSucceeds(legacyDeleteVote(db, "alice", "spain", "Spain"));
    expect(await counts("spain")).toEqual({ up: 0, down: 1 });
  });

  test("retracting at a zero count clamps instead of failing", async () => {
    const db = verifiedDb(env, "alice");
    await legacyCastVote(db, "alice", "italy", "Italy", "up");
    // Counts drifted to 0 (e.g. vandalism under the old rules).
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore() as never, "countryTallies", "italy"), {
        country: "Italy",
        upvotes: 0,
        downvotes: 0,
      });
    });
    await assertSucceeds(legacyRetractVote(db, "alice", "italy", "Italy"));
    expect(await counts("italy")).toEqual({ up: 0, down: 0 });
  });
});
