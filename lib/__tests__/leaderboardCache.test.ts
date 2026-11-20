jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock")
);
jest.mock("../firebase", () => ({ db: {}, auth: null, isFirebaseConfigured: true }));
jest.mock("../demo", () => ({ isDemo: () => false, DEMO_LEADERBOARD: [] }));
jest.mock("firebase/firestore", () => ({
  collection: jest.fn(),
  deleteDoc: jest.fn(() => Promise.resolve()),
  doc: jest.fn(),
  getDoc: jest.fn(),
  getDocs: jest.fn(),
  limit: jest.fn(),
  orderBy: jest.fn(),
  query: jest.fn(),
  serverTimestamp: jest.fn(),
  setDoc: jest.fn(() => Promise.resolve()),
}));

let getDocs: jest.Mock;
let limit: jest.Mock;

const row = (uid: string, xp: number) => ({ uid, displayName: uid, xp, level: 1, currentStreak: 0, longestStreak: 0 });

function serve(rows: ReturnType<typeof row>[]) {
  (getDocs as jest.Mock).mockResolvedValue({ docs: rows.map((r) => ({ data: () => r })) });
}

let mod: typeof import("../cloudSync");
let now = 1_000_000_000_000;

beforeEach(() => {
  jest.resetModules();
  jest.spyOn(Date, "now").mockImplementation(() => now);
  const storage = require("@react-native-async-storage/async-storage");
  void (storage.default ?? storage).clear();
  ({ getDocs, limit } = require("firebase/firestore"));
  mod = require("../cloudSync");
});

test("fetches the top 50 once, then serves the cache for 30 minutes", async () => {
  serve([row("a", 30), row("b", 20)]);
  expect(await mod.fetchLeaderboard()).toHaveLength(2);
  expect(limit).toHaveBeenLastCalledWith(50);
  now += 29 * 60_000;
  await mod.fetchLeaderboard();
  expect(getDocs).toHaveBeenCalledTimes(1);
  now += 2 * 60_000;
  await mod.fetchLeaderboard();
  expect(getDocs).toHaveBeenCalledTimes(2);
});

test("pull-to-refresh refetches at most once a minute", async () => {
  serve([row("a", 30)]);
  await mod.fetchLeaderboard({ force: true });
  await mod.fetchLeaderboard({ force: true });
  expect(getDocs).toHaveBeenCalledTimes(1);
  now += 61_000;
  await mod.fetchLeaderboard({ force: true });
  expect(getDocs).toHaveBeenCalledTimes(2);
});

test("the user's own push is patched into the cached list", async () => {
  serve([row("a", 30), row("b", 20)]);
  await mod.fetchLeaderboard();
  const summary = mod.toCloudSummary("me", "Me", true, [], {
    xp: 25,
    level: 2,
    currentStreak: 1,
    longestStreak: 1,
    lastScanLocalDate: null,
    unlockedBadgeIds: [],
    badgeUnlockedAt: {},
    voteXp: 0,
    voteCount: 0,
  });
  await mod.pushSummary(summary);
  expect((await mod.fetchLeaderboard()).map((e) => e.uid)).toEqual(["a", "me", "b"]);

  await mod.pushSummary({ ...summary, leaderboardOptIn: false }, { removeFromLeaderboard: true });
  expect((await mod.fetchLeaderboard()).map((e) => e.uid)).toEqual(["a", "b"]);
  expect(getDocs).toHaveBeenCalledTimes(1);
});

test("a failed fetch keeps the cached list", async () => {
  serve([row("a", 30)]);
  await mod.fetchLeaderboard();
  now += 31 * 60_000;
  (getDocs as jest.Mock).mockRejectedValue(new Error("quota"));
  expect((await mod.fetchLeaderboard()).map((e) => e.uid)).toEqual(["a"]);
});
