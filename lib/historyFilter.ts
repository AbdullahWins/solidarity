import { isVotableCountry } from "./votes";
import type { ScanRecord } from "./types";

export type ToneFilter = "all" | "fine" | "avoid" | "neutral";
export type PeriodFilter = "all" | "today" | "7d" | "30d";

export type HistoryFilter = { query: string; tone: ToneFilter; period: PeriodFilter };

export const NO_FILTER: HistoryFilter = { query: "", tone: "all", period: "all" };

/** How a past scan reads: its brand rule, then country rule at scan time, else the community verdict then. */
export function toneOf(scan: ScanRecord): Exclude<ToneFilter, "all"> {
  if (scan.brandRule) return scan.brandRule.rule === "support" ? "fine" : "avoid";
  if (!isVotableCountry(scan.country)) return "neutral";
  if (scan.rule) return scan.rule === "support" ? "fine" : "avoid";
  return scan.isPositive ? "fine" : "avoid";
}

function periodStart(period: PeriodFilter, now: Date): number {
  if (period === "all") return -Infinity;
  const start = new Date(now);
  start.setHours(0, 0, 0, 0); // local midnight
  if (period === "7d") start.setDate(start.getDate() - 6);
  if (period === "30d") start.setDate(start.getDate() - 29);
  return start.getTime();
}

export const isFiltered = (f: HistoryFilter) => f.query.trim() !== "" || f.tone !== "all" || f.period !== "all";

/**
 * Case-insensitive search over country, product name, brand, owner and barcode
 * digits, combined with verdict and period filters.
 */
export function filterScans(scans: ScanRecord[], filter: HistoryFilter, now = new Date()): ScanRecord[] {
  const q = filter.query.trim().toLowerCase();
  const digits = q.replace(/[\s-]/g, "");
  const searchDigits = /^\d+$/.test(digits);
  const from = periodStart(filter.period, now);
  return scans.filter((s) => {
    if (filter.tone !== "all" && toneOf(s) !== filter.tone) return false;
    if (Date.parse(s.scannedAt) < from) return false;
    if (!q) return true;
    if (searchDigits && s.code.includes(digits)) return true;
    return [s.country, s.productName, s.brand, s.owner].some((v) => v?.toLowerCase().includes(q));
  });
}
