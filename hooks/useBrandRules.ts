import { useSyncExternalStore } from "react";

import { getCachedBrandRules, subscribeBrandRules, type BrandRules } from "../lib/brandRules";

/** Current brand and company rules; re-renders every mounted screen on change. */
export function useBrandRules(): BrandRules {
  return useSyncExternalStore(subscribeBrandRules, getCachedBrandRules, getCachedBrandRules);
}
