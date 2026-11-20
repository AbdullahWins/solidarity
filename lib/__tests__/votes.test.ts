import AsyncStorage from "@react-native-async-storage/async-storage";

jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock")
);
jest.mock("../firebase", () => ({ db: {}, auth: { currentUser: null }, isFirebaseConfigured: true }));
jest.mock("firebase/firestore", () => ({
  collection: jest.fn(),
  doc: jest.fn(() => ({})),
  FieldPath: jest.fn(),
  getDoc: jest.fn(() => Promise.reject(new Error("quota exceeded"))),
  getDocs: jest.fn(() => Promise.reject(new Error("quota exceeded"))),
  runTransaction: jest.fn(),
  serverTimestamp: jest.fn(),
  updateDoc: jest.fn(),
}));

import { getDoc } from "firebase/firestore";
import { getAllTallies } from "../votes";

const CACHE_KEY = "solidarity:v1:countryTalliesCache";

describe("getAllTallies", () => {
  test("keeps showing cached counts when Firestore fails", async () => {
    const cached = { germany: { country: "Germany", upvotes: 4, downvotes: 1 } };
    // Older than the 3h TTL, so a fetch is attempted and fails.
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify({ tallies: cached, fetchedAt: Date.now() - 4 * 3600_000 }));
    await expect(getAllTallies()).resolves.toEqual(cached);
    expect(getDoc).toHaveBeenCalledTimes(1);
  });

  test("a cache younger than 3 hours makes no request", async () => {
    const cached = { france: { country: "France", upvotes: 1, downvotes: 0 } };
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify({ tallies: cached, fetchedAt: Date.now() - 2 * 3600_000 }));
    (getDoc as jest.Mock).mockClear();
    // A fresh module instance, so only the persisted cache is available.
    let result: Promise<unknown> = Promise.resolve();
    jest.isolateModules(() => {
      result = (require("../votes") as typeof import("../votes")).getAllTallies();
    });
    await expect(result).resolves.toEqual(cached);
    expect(getDoc).not.toHaveBeenCalled();
  });
});
