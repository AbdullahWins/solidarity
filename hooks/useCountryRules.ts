import { useSyncExternalStore } from "react";

import { getCachedRules, subscribeRules, type Rules } from "../lib/countryRules";

/** The current personal rules; re-renders every mounted screen on change. */
export function useCountryRules(): Rules {
  return useSyncExternalStore(subscribeRules, getCachedRules, getCachedRules);
}
