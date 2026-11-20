/**
 * The real lib/votes.ts client against the emulator and the real rules:
 * single-read fetches, bootstrap/reconcile of the aggregate, and votes that
 * keep the aggregate equal to the per-country tallies.
 */
import { type RulesTestEnvironment } from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc, Timestamp, type Firestore } from "firebase/firestore";

import { createEnv, verifiedDb } from "./env";
import { legacyCastVote } from "./legacyClient";

const holder: { db: Firestore | null; auth: { currentUser: { emailVerified: boolean } | null } } = {
  db: null,
  auth: { currentUser: null },
};

jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock")
);
jest.mock("../../lib/firebase", () => ({
  get db() {
    return holder.db;
  },
  get auth() {
    return holder.auth;
  },
  isFirebaseConfigured: true,
}));

// Imported after the mocks are registered (babel-jest hoists jest.mock).
import { castVote, deleteAllVotesForUser, getAllTallies, retractVote, whenRepaired } from "../../lib/votes";

let env: RulesTestEnvironment;

beforeAll(async () => {
  env = await createEnv();
});
afterAll(async () => {
  await env.cleanup();
});
beforeEach(async () => {
  await env.clearFirestore();
  holder.db = null;
  holder.auth.currentUser = null;
});

function signInAs(uid: string, verified = true) {
  holder.db = verified ? verifiedDb(env, uid) : (env.authenticatedContext(uid).firestore() as unknown as Firestore);
  holder.auth.currentUser = { emailVerified: verified };
}

async function seed(path: string, data: Record<string, unknown>) {
  await env.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore() as never, path), data);
  });
}

async function read(path: string) {
  let data: Record<string, any> | undefined;
  await env.withSecurityRulesDisabled(async (ctx) => {
    data = (await getDoc(doc(ctx.firestore() as never, path))).data();
  });
  return data;
}

const hoursAgo = (h: number) => Timestamp.fromMillis(Date.now() - h * 3600_000);

async function expectMirrored(key: string) {
  const tally = await read(`countryTallies/${key}`);
  const agg = await read("aggregates/countryTallies");
  expect(agg?.tallies?.[key]).toMatchObject({ upvotes: tally?.upvotes, downvotes: tally?.downvotes });
}

describe("fetching tallies", () => {
  test("a fresh aggregate is used as-is (no per-country reads)", async () => {
    // The per-country doc disagrees on purpose: if it were read, we'd see 2/1.
    await seed("countryTallies/germany", { country: "Germany", upvotes: 2, downvotes: 1 });
    await seed("aggregates/countryTallies", {
      tallies: { germany: { country: "Germany", upvotes: 5, downvotes: 5 } },
      syncedAt: hoursAgo(1),
    });
    signInAs("alice");
    const tallies = await getAllTallies(true);
    expect(tallies.germany).toMatchObject({ upvotes: 5, downvotes: 5 });
  });

  test("a missing aggregate is bootstrapped from the per-country tallies", async () => {
    await seed("countryTallies/germany", { country: "Germany", upvotes: 2, downvotes: 1 });
    await seed("countryTallies/france", { country: "France", upvotes: 0, downvotes: 3 });
    signInAs("alice");
    const tallies = await getAllTallies(true);
    expect(tallies.france).toMatchObject({ upvotes: 0, downvotes: 3 });
    await whenRepaired();
    await expectMirrored("germany");
    await expectMirrored("france");
  });

  test("a stale aggregate picks up votes cast by old app versions", async () => {
    await seed("aggregates/countryTallies", { tallies: {}, syncedAt: hoursAgo(1) });
    signInAs("alice");
    await castVote("alice", "Germany", "up");
    // bob is on app 1.1.0: only the per-country doc moves.
    await legacyCastVote(verifiedDb(env, "bob"), "bob", "germany", "Germany", "up");
    expect((await read("aggregates/countryTallies"))?.tallies.germany.upvotes).toBe(1);

    await seed("aggregates/countryTallies", {
      ...(await read("aggregates/countryTallies")),
      syncedAt: hoursAgo(25),
    });
    const tallies = await getAllTallies(true);
    expect(tallies.germany.upvotes).toBe(2);
    await whenRepaired();
    await expectMirrored("germany");
  });

  test("signed-out users read a stale aggregate without writing", async () => {
    await seed("aggregates/countryTallies", {
      tallies: { spain: { country: "Spain", upvotes: 1, downvotes: 0 } },
      syncedAt: hoursAgo(30),
    });
    holder.db = env.unauthenticatedContext().firestore() as unknown as Firestore;
    const tallies = await getAllTallies(true);
    expect(tallies.spain.upvotes).toBe(1);
    expect((await read("aggregates/countryTallies"))?.syncedAt.toMillis()).toBeLessThan(Date.now() - 29 * 3600_000);
  });
});

describe("voting keeps the aggregate in step", () => {
  beforeEach(async () => {
    await seed("aggregates/countryTallies", { tallies: {}, syncedAt: hoursAgo(1) });
    signInAs("alice");
  });

  test("cast, change and retract", async () => {
    expect(await castVote("alice", "Germany", "up")).not.toBeNull();
    await expectMirrored("germany");
    expect(await castVote("alice", "Germany", "down")).not.toBeNull();
    await expectMirrored("germany");
    expect(await retractVote("alice", "Germany")).not.toBeNull();
    await expectMirrored("germany");
    expect((await read("countryTallies/germany"))).toMatchObject({ upvotes: 0, downvotes: 0 });
  });

  test("account deletion subtracts from both", async () => {
    await castVote("alice", "France", "down");
    signInAs("bob");
    await castVote("bob", "France", "down");
    signInAs("alice");
    await deleteAllVotesForUser("alice");
    expect(await read("countryTallies/france")).toMatchObject({ downvotes: 1 });
    await expectMirrored("france");
    expect(await read("countryVotes/france/voters/alice")).toBeUndefined();
  });

  test("votes still work before the aggregate exists", async () => {
    await env.clearFirestore();
    expect(await castVote("alice", "Italy", "up")).not.toBeNull();
    expect(await read("countryTallies/italy")).toMatchObject({ upvotes: 1 });
    expect(await read("aggregates/countryTallies")).toBeUndefined();
  });
});
