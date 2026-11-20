import { useMemo, useSyncExternalStore } from "react";

import { basketCounts, getBasket, subscribeBasket } from "../lib/basket";

/** The open basket and its counts by tone; re-renders on every change. */
export function useBasket() {
  const basket = useSyncExternalStore(subscribeBasket, getBasket, getBasket);
  const counts = useMemo(() => basketCounts(basket.items), [basket.items]);
  return { basket, counts };
}
