jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock")
);
jest.mock("../firebase", () => ({ db: null, auth: null, isFirebaseConfigured: false }));

import { filterScans, NO_FILTER, toneOf } from "../historyFilter";
import type { ScanRecord } from "../types";

const now = new Date(2026, 10, 20, 15, 0); // local time
const at = (daysAgo: number, hour = 10) => new Date(2026, 10, 20 - daysAgo, hour).toISOString();

const scans: ScanRecord[] = [
  { id: "1", code: "3017620422003", country: "France", isPositive: true, source: "camera", scannedAt: at(0), productName: "Nutella", brand: "Nutella", owner: "Ferrero" },
  { id: "2", code: "4006381333931", country: "Germany", isPositive: false, source: "camera", scannedAt: at(3) },
  { id: "3", code: "5601234567892", country: "Portugal", isPositive: false, source: "manual", scannedAt: at(10), rule: "support" },
  { id: "4", code: "9771234567003", country: "Serial publications (ISSN)", isPositive: true, source: "camera", scannedAt: at(40) },
];

const ids = (r: ScanRecord[]) => r.map((s) => s.id);

test("no filter returns everything", () => {
  expect(ids(filterScans(scans, NO_FILTER, now))).toEqual(["1", "2", "3", "4"]);
});

test("search matches country, product, brand and barcode digits, ignoring case", () => {
  expect(ids(filterScans(scans, { ...NO_FILTER, query: "NUTELLA" }, now))).toEqual(["1"]);
  expect(ids(filterScans(scans, { ...NO_FILTER, query: "ferrero" }, now))).toEqual(["1"]);
  expect(ids(filterScans(scans, { ...NO_FILTER, query: "germ" }, now))).toEqual(["2"]);
  expect(ids(filterScans(scans, { ...NO_FILTER, query: "4006 381" }, now))).toEqual(["2"]);
});

test("tone uses the rule at scan time, and non-country ranges are neutral", () => {
  expect(toneOf(scans[2])).toBe("fine");
  expect(toneOf(scans[3])).toBe("neutral");
  expect(ids(filterScans(scans, { ...NO_FILTER, tone: "avoid" }, now))).toEqual(["2"]);
  expect(ids(filterScans(scans, { ...NO_FILTER, tone: "neutral" }, now))).toEqual(["4"]);
});

test("period boundaries are local days", () => {
  expect(ids(filterScans(scans, { ...NO_FILTER, period: "today" }, now))).toEqual(["1"]);
  expect(ids(filterScans(scans, { ...NO_FILTER, period: "7d" }, now))).toEqual(["1", "2"]);
  expect(ids(filterScans(scans, { ...NO_FILTER, period: "30d" }, now))).toEqual(["1", "2", "3"]);
  // Six days ago at midnight is still inside "7 days".
  const edge = [{ ...scans[1], scannedAt: new Date(2026, 10, 14, 0, 0).toISOString() }];
  expect(filterScans(edge, { ...NO_FILTER, period: "7d" }, now)).toHaveLength(1);
});

test("a brand rule at scan time decides the tone, even outside country ranges", () => {
  expect(toneOf({ ...scans[0], brandRule: { rule: "avoid", target: "Ferrero" } })).toBe("avoid");
  expect(toneOf({ ...scans[3], brandRule: { rule: "support", target: "X" } })).toBe("fine");
});

test("filters combine", () => {
  expect(ids(filterScans(scans, { query: "portugal", tone: "fine", period: "30d" }, now))).toEqual(["3"]);
  expect(filterScans(scans, { query: "portugal", tone: "avoid", period: "all" }, now)).toHaveLength(0);
});
