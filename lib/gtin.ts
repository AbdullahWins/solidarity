// GTIN (EAN/UPC) parsing and validation.
//
// Why this exists: Android's ML Kit reports UPC-A as 12 digits, while iOS
// reports the same barcode as a 13-digit EAN with a leading zero. The GS1
// country prefix is the first three digits of the GTIN-13, so a 12-digit
// UPC-A must be left-padded before the lookup. Previously "036000291452" was
// read as prefix "036" (USA drugs) instead of "003" (USA & Canada).

export type BarcodeKind = "ean13" | "ean8" | "upc_a" | "upc_e" | "gtin14";

export type ParsedBarcode =
  | {
      ok: true;
      /** Digits as captured/typed (cleaned of spaces and dashes). */
      code: string;
      kind: BarcodeKind;
      /** Three-digit GS1 prefix used for the country lookup, or null for restricted EAN-8 ranges. */
      prefix: string | null;
    }
  | { ok: false; reason: "empty" | "length" | "checksum"; message: string };

const onlyDigits = (raw: string) => raw.replace(/\D/g, "");

/** GS1 mod-10 check digit for a body (all digits except the check digit). */
export function computeCheckDigit(body: string): number {
  let sum = 0;
  for (let i = 0; i < body.length; i++) {
    const n = body.charCodeAt(body.length - 1 - i) - 48;
    sum += i % 2 === 0 ? n * 3 : n;
  }
  return (10 - (sum % 10)) % 10;
}

/** True when the last digit is the correct GS1 check digit for the rest. */
export function hasValidCheckDigit(digits: string): boolean {
  if (!/^\d+$/.test(digits) || digits.length < 2) return false;
  return computeCheckDigit(digits.slice(0, -1)) === digits.charCodeAt(digits.length - 1) - 48;
}

/** Expand an 8-digit UPC-E (number system + 6 digits + check) to 12-digit UPC-A. */
export function expandUpcE(upce: string): string | null {
  if (!/^[01]\d{7}$/.test(upce)) return null;
  const ns = upce[0];
  const d = upce.slice(1, 7);
  const check = upce[7];
  const last = d[5];
  let body: string;
  switch (last) {
    case "0":
    case "1":
    case "2":
      body = `${d[0]}${d[1]}${last}0000${d[2]}${d[3]}${d[4]}`;
      break;
    case "3":
      body = `${d[0]}${d[1]}${d[2]}00000${d[3]}${d[4]}`;
      break;
    case "4":
      body = `${d[0]}${d[1]}${d[2]}${d[3]}00000${d[4]}`;
      break;
    default:
      body = `${d[0]}${d[1]}${d[2]}${d[3]}${d[4]}0000${last}`;
  }
  return `${ns}${body}${check}`;
}

const lengthError = {
  ok: false as const,
  reason: "length" as const,
  message: "Barcodes have 8, 12, 13 or 14 digits.",
};
const checksumError = {
  ok: false as const,
  reason: "checksum" as const,
  message: "That barcode's check digit doesn't match. Check for a typo.",
};

/**
 * Parse a scanned or typed barcode.
 * @param raw   the value from the scanner or text field
 * @param hint  the symbology reported by the camera, if any
 */
export function parseBarcode(raw: string, hint?: string): ParsedBarcode {
  const digits = onlyDigits(raw ?? "");
  if (!digits) return { ok: false, reason: "empty", message: "Enter a barcode number." };

  if (hint === "upc_e" || (digits.length === 6 && hint === undefined)) {
    // Some scanners drop the number-system and check digits from UPC-E;
    // assume number system 0 and derive the check digit.
    let eight = digits;
    if (digits.length === 6) {
      const body11 = expandUpcE(`0${digits}0`)!.slice(0, 11);
      eight = `0${digits}${computeCheckDigit(body11)}`;
    }
    const upca = expandUpcE(eight);
    if (!upca) return lengthError;
    if (!hasValidCheckDigit(upca)) return checksumError;
    return { ok: true, code: eight, kind: "upc_e", prefix: `0${upca.slice(0, 2)}` };
  }

  switch (digits.length) {
    case 8: {
      if (hasValidCheckDigit(digits)) {
        // EAN-8 prefixes 0xx and 2xx are restricted (in-store / velocity codes).
        const restricted = digits[0] === "0" || digits[0] === "2";
        return { ok: true, code: digits, kind: "ean8", prefix: restricted ? null : digits.slice(0, 3) };
      }
      const upca = expandUpcE(digits);
      if (upca && hasValidCheckDigit(upca)) {
        return { ok: true, code: digits, kind: "upc_e", prefix: `0${upca.slice(0, 2)}` };
      }
      return checksumError;
    }
    case 12:
      if (!hasValidCheckDigit(digits)) return checksumError;
      return { ok: true, code: digits, kind: "upc_a", prefix: `0${digits.slice(0, 2)}` };
    case 13:
      if (!hasValidCheckDigit(digits)) return checksumError;
      return { ok: true, code: digits, kind: "ean13", prefix: digits.slice(0, 3) };
    case 14:
      if (!hasValidCheckDigit(digits)) return checksumError;
      // Drop the packaging indicator digit; the next three are the GS1 prefix.
      return { ok: true, code: digits, kind: "gtin14", prefix: digits.slice(1, 4) };
    default:
      return lengthError;
  }
}
