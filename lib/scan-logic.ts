import { countryCodeMap } from "../constants/country-map";
import { parseBarcode } from "./gtin";

// Pre-split ranges once instead of on every lookup.
const RANGES = Object.entries(countryCodeMap)
  .filter(([key]) => key.includes("-"))
  .map(([key, country]) => {
    const [min, max] = key.split("-").map(Number);
    return { min, max, country };
  });

/** Country/region for a three-digit GS1 prefix, or null if unassigned. */
export function countryForPrefix(prefix: string | null): string | null {
  if (prefix === null) return "Reserved";
  if (!/^\d{3}$/.test(prefix)) return null;
  if (countryCodeMap[prefix]) return countryCodeMap[prefix];
  const n = parseInt(prefix, 10);
  return RANGES.find((r) => n >= r.min && n <= r.max)?.country ?? null;
}

/** Country/region for a raw barcode; null when the barcode is invalid or unassigned. */
export const identifyCountry = (barcode: string | null, hint?: string): string | null => {
  if (!barcode) return null;
  const parsed = parseBarcode(barcode, hint);
  return parsed.ok ? countryForPrefix(parsed.prefix) : null;
};
