import { scanFromURLAsync } from "expo-camera";

import { parseBarcode } from "./gtin";

/** Retail symbologies the app understands (same as the live camera). */
export const RETAIL_TYPES = ["ean13", "ean8", "upc_a", "upc_e"] as const;

export type FoundCode = { raw: string; type: string; code: string };

/**
 * Keeps only valid retail barcodes from an image scan, one per code (an image
 * can report the same barcode twice, or as both EAN-13 and UPC-A).
 */
export function pickRetailCodes(results: { data: string; type: string }[]): FoundCode[] {
  const seen = new Set<string>();
  const out: FoundCode[] = [];
  for (const r of results) {
    if (!r.data || !(RETAIL_TYPES as readonly string[]).includes(r.type)) continue;
    const parsed = parseBarcode(r.data, r.type);
    if (!parsed.ok || seen.has(parsed.code)) continue;
    // UPC-A "036000291452" and EAN-13 "0036000291452" are the same product.
    const key = parsed.code.replace(/^0+/, "");
    if (seen.has(key)) continue;
    seen.add(parsed.code);
    seen.add(key);
    out.push({ raw: r.data, type: r.type, code: parsed.code });
  }
  return out;
}

/** Reads every retail barcode in an image file. Never throws; unreadable images give []. */
export async function scanImage(uri: string): Promise<FoundCode[]> {
  try {
    return pickRetailCodes(await scanFromURLAsync(uri, [...RETAIL_TYPES]));
  } catch {
    return [];
  }
}

export type PhotoPlan = { kind: "none" } | { kind: "one"; code: FoundCode } | { kind: "choose"; codes: FoundCode[] } | { kind: "all"; codes: FoundCode[] };

/** What to do with an image's barcodes: nothing, check one, ask which, or (basket) add them all. */
export function planPhoto(codes: FoundCode[], basketMode: boolean): PhotoPlan {
  if (codes.length === 0) return { kind: "none" };
  if (codes.length === 1) return { kind: "one", code: codes[0] };
  return basketMode ? { kind: "all", codes } : { kind: "choose", codes: codes.slice(0, 4) };
}
