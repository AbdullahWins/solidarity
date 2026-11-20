import { useEffect, useState } from "react";

import { DEMO_PRODUCTS, isDemo } from "../lib/demo";
import { lookupProduct, type LookupResult } from "../lib/productLookup";

export type ProductState = { status: "idle" } | { status: "loading" } | LookupResult;

/**
 * Looks up `code` once when `enabled` (the user turned product names on).
 * Cancelled when the result closes or the code changes; `onFound` lets the
 * caller save the name onto the scan record.
 */
export function useProductLookup(
  code: string | null,
  enabled: boolean,
  onFound?: (result: Extract<LookupResult, { status: "found" }>) => void
): ProductState {
  // The latest answer, tagged with the code it belongs to.
  const [settled, setSettled] = useState<{ code: string; result: LookupResult } | null>(null);
  const demo = isDemo();

  useEffect(() => {
    if (!code || !enabled || demo) return;
    const controller = new AbortController();
    void lookupProduct(code, { signal: controller.signal }).then((result) => {
      if (controller.signal.aborted) return;
      setSettled({ code, result });
      if (result.status === "found") onFound?.(result);
    });
    return () => controller.abort();
    // onFound is a callback from the caller; re-running on its identity would refetch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, enabled, demo]);

  if (!code || !enabled) return { status: "idle" };
  if (demo) {
    const product = DEMO_PRODUCTS[code];
    return product ? { status: "found", product } : { status: "not-found" };
  }
  return settled?.code === code ? settled.result : { status: "loading" };
}
