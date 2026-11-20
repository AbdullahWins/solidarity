jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock")
);
jest.mock("../firebase", () => ({ db: null, auth: null, isFirebaseConfigured: false }));

import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  clearAllRules,
  getCachedRules,
  getRule,
  loadRules,
  mergeRules,
  resolveAnswer,
  setRule,
  subscribeRules,
} from "../countryRules";

beforeEach(async () => {
  await clearAllRules();
});

test("set, read back and clear a rule", async () => {
  await setRule("Germany", "avoid");
  expect(getRule("Germany")).toBe("avoid");
  expect(getCachedRules()).toEqual({ germany: "avoid" });
  await setRule("Germany", null);
  expect(getRule("Germany")).toBeUndefined();
});

test("rules persist and reload", async () => {
  await setRule("United Kingdom", "support");
  expect(JSON.parse((await AsyncStorage.getItem("solidarity:v1:countryRules"))!)).toEqual({ "united-kingdom": "support" });
  await loadRules();
  expect(getRule("United Kingdom")).toBe("support");
});

test("clear all removes every rule", async () => {
  await setRule("France", "avoid");
  await setRule("Spain", "support");
  await clearAllRules();
  expect(getCachedRules()).toEqual({});
});

test("non-votable ranges can't get a rule", async () => {
  await setRule("Coupons", "avoid");
  expect(getCachedRules()).toEqual({});
});

test("subscribers hear about changes", async () => {
  const listener = jest.fn();
  const off = subscribeRules(listener);
  await setRule("Italy", "support");
  expect(listener).toHaveBeenCalled();
  off();
});

test("merging keeps existing local rules", async () => {
  await setRule("France", "avoid");
  await mergeRules({ france: "support", spain: "support" });
  expect(getCachedRules()).toEqual({ france: "avoid", spain: "support" });
});

describe("resolveAnswer", () => {
  test("a personal rule beats the community verdict", () => {
    expect(resolveAnswer("Germany", false, { germany: "support" })).toEqual({ source: "rule", tone: "positive", rule: "support" });
    expect(resolveAnswer("Germany", true, { germany: "avoid" })).toEqual({ source: "rule", tone: "negative", rule: "avoid" });
  });
  test("without a rule the community decides", () => {
    expect(resolveAnswer("Germany", true, {})).toEqual({ source: "community", tone: "positive" });
    expect(resolveAnswer("Germany", false, {})).toEqual({ source: "community", tone: "negative" });
  });
  test("non-votable ranges are neutral", () => {
    expect(resolveAnswer("Unknown", true, {}).tone).toBe("neutral");
  });
});
