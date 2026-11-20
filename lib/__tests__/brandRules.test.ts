jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock")
);
jest.mock("expo-constants", () => ({ expoConfig: { version: "1.2.0" } }));
jest.mock("../firebase", () => ({ db: null, auth: null, isFirebaseConfigured: false }));

import {
  brandRuleFor,
  clearAllBrandRules,
  getBrandRule,
  getCachedBrandRules,
  loadBrandRules,
  mergeBrandRules,
  setBrandRule,
} from "../brandRules";
import { resolveAnswer } from "../countryRules";

beforeEach(async () => {
  await clearAllBrandRules();
});

test("rules match regardless of case, accents and punctuation", async () => {
  await setBrandRule("Nestlé S.A.", "avoid");
  expect(getBrandRule("NESTLE s a")).toEqual({ rule: "avoid", label: "Nestlé S.A." });
  await loadBrandRules();
  expect(getBrandRule("nestle-s-a")?.rule).toBe("avoid");
});

test("set and clear", async () => {
  await setBrandRule("Ferrero", "support");
  await setBrandRule("Ferrero", null);
  expect(getCachedBrandRules()).toEqual({});
});

test("merge keeps existing local rules and skips junk", async () => {
  await setBrandRule("Ferrero", "avoid");
  const added = await mergeBrandRules({
    ferrero: { rule: "support", label: "Ferrero" },
    danone: { rule: "support", label: "Danone" },
    "BAD KEY": { rule: "avoid", label: "x" },
    mars: { rule: "boycott", label: "Mars" },
  });
  expect(added).toBe(1);
  expect(getCachedBrandRules()).toEqual({
    ferrero: { rule: "avoid", label: "Ferrero" },
    danone: { rule: "support", label: "Danone" },
  });
});

describe("answer precedence", () => {
  const rules = {
    nestle: { rule: "avoid" as const, label: "Nestlé" },
    kitkat: { rule: "support" as const, label: "KitKat" },
    stabilo: { rule: "support" as const, label: "Stabilo" },
  };

  test("a company rule beats the country rule", () => {
    const a = resolveAnswer("Germany", true, { germany: "support" }, { brand: "Maggi", owner: "Nestlé" }, rules);
    expect(a).toMatchObject({ source: "brand-rule", tone: "negative", brand: { target: "Nestlé" }, rule: "support" });
  });

  test("a brand rule beats the community verdict", () => {
    expect(resolveAnswer("Germany", false, {}, { brand: "Stabilo" }, rules)).toMatchObject({ source: "brand-rule", tone: "positive" });
  });

  test("Avoid wins a brand/owner conflict", () => {
    expect(brandRuleFor({ brand: "KitKat", owner: "Nestlé" }, rules)).toEqual({ rule: "avoid", target: "Nestlé" });
  });

  test("brand rules apply even outside country ranges", () => {
    expect(resolveAnswer("Unknown", true, {}, { owner: "Nestlé" }, rules).tone).toBe("negative");
  });

  test("without product details nothing changes", () => {
    expect(resolveAnswer("Germany", true, {}, null, rules)).toEqual({ source: "community", tone: "positive" });
    expect(resolveAnswer("Germany", true, { germany: "avoid" }, undefined, rules)).toEqual({ source: "rule", tone: "negative", rule: "avoid" });
  });
});
