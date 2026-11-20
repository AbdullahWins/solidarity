import AsyncStorage from "@react-native-async-storage/async-storage";

import { normalizeName } from "./productLookup";

/**
 * Personal Avoid / Support rules for brands and companies (brand owners).
 * Brand and owner names share one namespace, so a rule on "Nestlé" applies
 * whether it appears as a product's brand or as its owner. On the device only.
 */
export type BrandRule = "avoid" | "support";
export type BrandRuleEntry = { rule: BrandRule; label: string };
export type BrandRules = Record<string, BrandRuleEntry>; // keyed by normalizeName(label)

const KEY = "solidarity:v1:brandRules";

let cache: BrandRules = {};
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export function subscribeBrandRules(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export const getCachedBrandRules = (): BrandRules => cache;

const validEntry = (v: unknown): v is BrandRuleEntry => {
  const e = v as BrandRuleEntry | null;
  return !!e && (e.rule === "avoid" || e.rule === "support") && typeof e.label === "string" && e.label.length > 0 && e.label.length <= 200;
};

export const isValidBrandRuleKey = (k: string) => /^[a-z0-9-]{1,120}$/.test(k);

export async function loadBrandRules(): Promise<BrandRules> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
    cache = Object.fromEntries(Object.entries(parsed).filter(([k, v]) => isValidBrandRuleKey(k) && validEntry(v))) as BrandRules;
  } catch {
    cache = {};
  }
  emit();
  return cache;
}

async function persist(next: BrandRules) {
  cache = next;
  emit();
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // best-effort; the in-memory copy still applies this session
  }
}

export function getBrandRule(name: string | undefined): BrandRuleEntry | undefined {
  return name ? cache[normalizeName(name)] : undefined;
}

/** Sets or (with null) clears the rule for a brand or company name. */
export async function setBrandRule(name: string, rule: BrandRule | null): Promise<void> {
  const key = normalizeName(name);
  if (!isValidBrandRuleKey(key)) return;
  const next = { ...cache };
  if (rule) next[key] = { rule, label: name.trim() };
  else delete next[key];
  await persist(next);
}

export async function clearAllBrandRules(): Promise<void> {
  await persist({});
}

/** Adds rules without overwriting existing local ones (backup import). */
export async function mergeBrandRules(incoming: Record<string, unknown>): Promise<number> {
  const next = { ...cache };
  let added = 0;
  for (const [key, entry] of Object.entries(incoming)) {
    if (isValidBrandRuleKey(key) && validEntry(entry) && !next[key]) {
      next[key] = { rule: entry.rule, label: entry.label };
      added += 1;
    }
  }
  await persist(next);
  return added;
}

/**
 * The rule that applies to a product, if any: its brand's or its owner's.
 * When they disagree, Avoid wins.
 */
export function brandRuleFor(
  product: { brand?: string; owner?: string } | null | undefined,
  rules: BrandRules = cache
): { rule: BrandRule; target: string } | undefined {
  if (!product) return undefined;
  const matches = [product.brand, product.owner]
    .filter((n): n is string => !!n)
    .map((n) => rules[normalizeName(n)])
    .filter((e): e is BrandRuleEntry => !!e);
  if (matches.length === 0) return undefined;
  const pick = matches.find((m) => m.rule === "avoid") ?? matches[0];
  return { rule: pick.rule, target: pick.label };
}
