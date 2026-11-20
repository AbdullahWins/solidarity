import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import { Platform } from "react-native";

import { APP_NAME, WEBSITE_URL } from "../constants/app-info";

/**
 * Optional product name, brand and photo from Open Food Facts (ODbL), an
 * open product database. Only the barcode is sent, and only after the user
 * turns product names on. Results are cached on the device.
 */

export type Product = {
  name?: string;
  brand?: string;
  image?: string;
  /** Parent company, when Open Food Facts knows it and it differs from the brand. */
  owner?: string;
  /** Most specific Open Food Facts category tags (e.g. "en:olive-oils"), up to 5. */
  categories?: string[];
};

export type LookupResult =
  | { status: "found"; product: Product }
  | { status: "not-found" }
  | { status: "unavailable" };

export const LOOKUP_TIMEOUT_MS = 4000;
const FOUND_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const NOT_FOUND_TTL_MS = 7 * 24 * 60 * 60 * 1000;
export const CACHE_LIMIT = 1000;
// v2: entries gained owner and categories, so v1 entries are fetched again once.
const CACHE_KEY = "solidarity:v2:productCache";

const APP_VERSION = Constants.expoConfig?.version ?? "1";

export const productPageUrl = (code: string) => `https://world.openfoodfacts.org/product/${code}`;
export const addProductUrl = (code: string) =>
  `https://world.openfoodfacts.org/cgi/product.pl?type=add&code=${code}`;

export function buildLookupUrl(code: string, platform: string = Platform.OS): string {
  const url = `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(code)}?fields=product_name,brands,image_front_small_url,brand_owner,categories_tags`;
  // Browsers forbid setting User-Agent; OFF accepts app_name instead.
  return platform === "web" ? `${url}&app_name=${encodeURIComponent(APP_NAME)}` : url;
}

/** Lowercase, accents stripped, punctuation collapsed: "Nestlé S.A." → "nestle-s-a". */
export function normalizeName(name: string): string {
  return name
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const clean = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim().slice(0, 120) : undefined);

export function parseLookupResponse(json: unknown): LookupResult {
  const body = json as { status?: number; product?: Record<string, unknown> } | null;
  if (!body || body.status !== 1 || !body.product) return { status: "not-found" };
  const name = clean(body.product.product_name);
  // "brands" is a comma-separated list; the first is the main one.
  const brand = clean(String(body.product.brands ?? "").split(",")[0]);
  const imageRaw = clean(body.product.image_front_small_url);
  const image = imageRaw?.startsWith("https://") ? imageRaw : undefined;
  if (!name && !brand) return { status: "not-found" };
  const ownerRaw = clean(body.product.brand_owner);
  const owner = ownerRaw && normalizeName(ownerRaw) !== normalizeName(brand ?? "") ? ownerRaw : undefined;
  const tags = Array.isArray(body.product.categories_tags) ? (body.product.categories_tags as unknown[]) : [];
  // Tags run from general to specific; keep the most specific English ones.
  const categories = tags
    .filter((t): t is string => typeof t === "string" && /^en:[a-z0-9-]{1,80}$/.test(t))
    .slice(-5);
  return {
    status: "found",
    product: { name, brand, image, ...(owner ? { owner } : {}), ...(categories.length ? { categories } : {}) },
  };
}

/** The fields of a found product that are saved on its scan record. */
export function productPatch(p: Product) {
  return {
    productName: p.name,
    brand: p.brand,
    ...(p.owner ? { owner: p.owner } : {}),
    ...(p.categories ? { categories: p.categories } : {}),
  };
}

// --- Cache -----------------------------------------------------------------

type CacheEntry = { found: boolean; product?: Product; at: number };
type Cache = Record<string, CacheEntry>;

let memory: Cache | null = null;

async function readCache(): Promise<Cache> {
  if (memory) return memory;
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    memory = raw ? (JSON.parse(raw) as Cache) : {};
  } catch {
    memory = {};
  }
  return memory;
}

async function writeCache(next: Cache): Promise<void> {
  memory = next;
  try {
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(next));
  } catch {
    // best-effort only
  }
}

export async function getCachedProduct(code: string, now = Date.now()): Promise<LookupResult | null> {
  const entry = (await readCache())[code];
  if (!entry) return null;
  const ttl = entry.found ? FOUND_TTL_MS : NOT_FOUND_TTL_MS;
  if (now - entry.at > ttl) return null;
  return entry.found && entry.product ? { status: "found", product: entry.product } : { status: "not-found" };
}

export async function cacheProduct(code: string, result: LookupResult, now = Date.now()): Promise<void> {
  if (result.status === "unavailable") return;
  const cache = { ...(await readCache()) };
  cache[code] = result.status === "found" ? { found: true, product: result.product, at: now } : { found: false, at: now };
  const keys = Object.keys(cache);
  if (keys.length > CACHE_LIMIT) {
    keys
      .sort((a, b) => cache[a].at - cache[b].at)
      .slice(0, keys.length - CACHE_LIMIT)
      .forEach((k) => delete cache[k]);
  }
  await writeCache(cache);
}

/** Forget cached products (tests). */
export function resetProductCacheMemory() {
  memory = null;
}

// --- Lookup ----------------------------------------------------------------

/**
 * Cached result if fresh, otherwise one request with a 4s timeout. Never
 * throws: network errors, timeouts and rate limits come back "unavailable".
 */
export async function lookupProduct(
  code: string,
  options: { signal?: AbortSignal; fetchImpl?: typeof fetch; now?: number } = {}
): Promise<LookupResult> {
  const cached = await getCachedProduct(code, options.now);
  if (cached) return cached;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), LOOKUP_TIMEOUT_MS);
  const onAbort = () => controller.abort();
  options.signal?.addEventListener("abort", onAbort);
  try {
    const res = await (options.fetchImpl ?? fetch)(buildLookupUrl(code), {
      signal: controller.signal,
      headers: Platform.OS === "web" ? {} : { "User-Agent": `${APP_NAME}/${APP_VERSION} (+${WEBSITE_URL})` },
    });
    if (res.status === 404) {
      const result: LookupResult = { status: "not-found" };
      await cacheProduct(code, result, options.now);
      return result;
    }
    if (!res.ok) return { status: "unavailable" };
    const result = parseLookupResponse(await res.json());
    await cacheProduct(code, result, options.now);
    return result;
  } catch {
    return { status: "unavailable" };
  } finally {
    clearTimeout(timer);
    options.signal?.removeEventListener("abort", onAbort);
  }
}
