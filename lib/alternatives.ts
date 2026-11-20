import { toneOf } from "./historyFilter";
import type { ScanRecord } from "./types";

/**
 * Suggestions for an avoid result: products from the user's own History in a
 * shared Open Food Facts category whose verdict was fine. On the device only.
 */
export function findAlternatives(
  scanned: { code: string; categories?: string[] },
  history: ScanRecord[],
  limit = 3
): ScanRecord[] {
  const wanted = new Set(scanned.categories ?? []);
  if (wanted.size === 0) return [];
  const seen = new Set<string>([scanned.code]);
  const out: ScanRecord[] = [];
  const newestFirst = [...history].sort((a, b) => Date.parse(b.scannedAt) - Date.parse(a.scannedAt));
  for (const s of newestFirst) {
    if (out.length >= limit) break;
    if (seen.has(s.code)) continue;
    if (!s.categories?.some((c) => wanted.has(c))) continue;
    if (toneOf(s) !== "fine") continue;
    seen.add(s.code);
    out.push(s);
  }
  return out;
}
