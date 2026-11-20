import AsyncStorage from "@react-native-async-storage/async-storage";

import { brandRuleFor, type BrandRule, type BrandRules } from "./brandRules";
import { isVotableCountry, normalizeCountryKey } from "./votes";

/**
 * Personal, on-device "I avoid / I support <country>" rules. They lead the
 * scan answer ahead of the community verdict and never leave the device:
 * not synced, not uploaded, not part of the cloud backup.
 */
export type CountryRule = "avoid" | "support";
export type Rules = Record<string, CountryRule>; // keyed by normalizeCountryKey

const KEY = "solidarity:v1:countryRules";

let cache: Rules = {};
const listeners = new Set<() => void>();

const emit = () => listeners.forEach((l) => l());

export function subscribeRules(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getCachedRules(): Rules {
  return cache;
}

export async function loadRules(): Promise<Rules> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as Rules) : {};
    cache = Object.fromEntries(
      Object.entries(parsed).filter(([, v]) => v === "avoid" || v === "support")
    ) as Rules;
  } catch {
    cache = {};
  }
  emit();
  return cache;
}

async function persist(next: Rules) {
  cache = next;
  emit();
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // best-effort; the in-memory copy still applies this session
  }
}

export function getRule(country: string): CountryRule | undefined {
  return cache[normalizeCountryKey(country)];
}

/** Sets or (with null) clears the rule for a votable country. */
export async function setRule(country: string, rule: CountryRule | null): Promise<void> {
  if (!isVotableCountry(country)) return;
  const key = normalizeCountryKey(country);
  const next = { ...cache };
  if (rule) next[key] = rule;
  else delete next[key];
  await persist(next);
}

export async function clearAllRules(): Promise<void> {
  await persist({});
}

/** Adds rules without overwriting existing local ones (used by backup import). */
export async function mergeRules(incoming: Rules): Promise<void> {
  const next = { ...cache };
  for (const [key, rule] of Object.entries(incoming)) {
    if ((rule === "avoid" || rule === "support") && !next[key]) next[key] = rule;
  }
  await persist(next);
}

export type Answer = {
  /** Where the primary answer comes from. */
  source: "brand-rule" | "rule" | "community" | "none";
  tone: "positive" | "negative" | "neutral";
  /** The country rule, if the user has one (shown second when a brand rule leads). */
  rule?: CountryRule;
  /** The brand or company rule that leads the answer, if any. */
  brand?: { rule: BrandRule; target: string };
};

const toneOfRule = (r: "avoid" | "support") => (r === "support" ? "positive" : "negative");

/**
 * The single answer for a scan, shared by the result, haptics, History and
 * the basket so they can never disagree. Order: a brand or company rule
 * (Avoid wins a conflict), then a country rule, then the community verdict.
 * Non-votable ranges are neutral unless a brand rule applies.
 */
export function resolveAnswer(
  country: string,
  communityPositive: boolean,
  rules: Rules = cache,
  product?: { brand?: string; owner?: string } | null,
  brandRules?: BrandRules
): Answer {
  const votable = isVotableCountry(country);
  const countryRule = votable ? rules[normalizeCountryKey(country)] : undefined;
  const brand = brandRuleFor(product, brandRules);
  if (brand) return { source: "brand-rule", tone: toneOfRule(brand.rule), brand, ...(countryRule ? { rule: countryRule } : {}) };
  if (!votable) return { source: "none", tone: "neutral" };
  if (countryRule) return { source: "rule", tone: toneOfRule(countryRule), rule: countryRule };
  return { source: "community", tone: communityPositive ? "positive" : "negative" };
}
