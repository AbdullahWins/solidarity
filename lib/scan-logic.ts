import { countryCodeMap } from "../constants/country-map";

export const identifyCountry = (barcode: string | null): string | null => {
  if (!barcode || typeof barcode !== "string") return null;

  const cleanBarcode = barcode.replace(/\D/g, "");
  if (cleanBarcode.length < 3) return null;

  const prefix = cleanBarcode.substring(0, 3);
  const prefixNum = parseInt(prefix, 10);

  if (countryCodeMap[prefix]) return countryCodeMap[prefix];

  for (const key of Object.keys(countryCodeMap)) {
    if (!key.includes("-")) continue;
    const [min, max] = key.split("-").map(Number);
    if (prefixNum >= min && prefixNum <= max) {
      return countryCodeMap[key];
    }
  }

  return null;
};
