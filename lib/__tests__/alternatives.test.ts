jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock")
);
jest.mock("../firebase", () => ({ db: null, auth: null, isFirebaseConfigured: false }));

import { findAlternatives } from "../alternatives";
import type { ScanRecord } from "../types";

let n = 0;
const scan = (extra: Partial<ScanRecord>): ScanRecord => ({
  id: `s${++n}`,
  code: `400638133${String(n).padStart(4, "0")}`,
  country: "Portugal",
  isPositive: true,
  source: "camera",
  scannedAt: new Date(Date.UTC(2026, 10, 1 + n)).toISOString(),
  ...extra,
});

const oil = ["en:olive-oils"];

test("same-category fine products, newest first, one per barcode", () => {
  const older = scan({ productName: "Oil A", categories: oil });
  const newer = scan({ productName: "Oil B", categories: ["en:oils", "en:olive-oils"] });
  const dupe = { ...newer, id: "dupe", scannedAt: new Date(Date.UTC(2026, 9, 1)).toISOString() };
  const result = findAlternatives({ code: "999", categories: oil }, [older, dupe, newer]);
  expect(result.map((s) => s.productName)).toEqual(["Oil B", "Oil A"]);
});

test("excludes the scanned product, avoid and neutral verdicts, and other categories", () => {
  const same = scan({ categories: oil });
  const avoid = scan({ categories: oil, isPositive: false });
  const brandAvoid = scan({ categories: oil, brandRule: { rule: "avoid", target: "X" } });
  const neutral = scan({ categories: oil, country: "Coupons" });
  const otherCat = scan({ categories: ["en:chocolates"] });
  expect(findAlternatives({ code: same.code, categories: oil }, [same, avoid, brandAvoid, neutral, otherCat])).toEqual([]);
});

test("no categories means no suggestions, and the limit holds", () => {
  const many = Array.from({ length: 6 }, () => scan({ categories: oil }));
  expect(findAlternatives({ code: "1" }, many)).toEqual([]);
  expect(findAlternatives({ code: "1", categories: oil }, many)).toHaveLength(3);
});
