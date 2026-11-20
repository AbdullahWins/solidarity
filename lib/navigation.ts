import { router } from "expo-router";

import { countryCodeMap } from "../constants/country-map";

/** Opens the country detail screen from anywhere in the app. */
export function openCountry(country: string) {
  router.push({ pathname: "/country/[name]", params: { name: country } });
}

/** GS1 prefixes registered to a country, formatted for display (e.g. "400–440"). */
export function prefixesFor(country: string): string[] {
  return Object.entries(countryCodeMap)
    .filter(([, name]) => name === country)
    .map(([range]) => range.replace("-", "–"));
}
