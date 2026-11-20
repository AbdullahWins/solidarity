import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * Basket mode: scan a whole cart without stopping. Each barcode is recorded
 * at most once per basket. Items are normal scans (they stay in History);
 * finishing or discarding a basket only clears this list.
 */

export type Tone = "positive" | "negative" | "neutral";

export type BasketItem = {
  scanId: string;
  code: string;
  country: string;
  tone: Tone;
  productName?: string;
  addedAt: number;
};

export type Basket = {
  active: boolean;
  startedAt: number;
  lastAddedAt: number;
  items: BasketItem[];
};

export const BASKET_EXPIRY_MS = 12 * 60 * 60 * 1000;
const KEY = "solidarity:v1:basket";

const empty = (now: number, active = false): Basket => ({ active, startedAt: now, lastAddedAt: now, items: [] });

let state: Basket = empty(0);
const listeners = new Set<() => void>();

export function subscribeBasket(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export const getBasket = (): Basket => state;

async function commit(next: Basket) {
  state = next;
  listeners.forEach((l) => l());
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // best-effort; the in-memory basket still works this session
  }
}

let loading: Promise<Basket> | null = null;

/** Resolves once the saved basket has been loaded (loads it if nobody has yet). */
export function ensureBasketLoaded(): Promise<Basket> {
  return loading ?? loadBasket();
}

/** Loads the saved basket, discarding it if it went 12 hours without an addition. */
export function loadBasket(now = Date.now()): Promise<Basket> {
  loading = readSavedBasket(now);
  return loading;
}

async function readSavedBasket(now: number): Promise<Basket> {
  let saved: Basket | null = null;
  try {
    const raw = await AsyncStorage.getItem(KEY);
    saved = raw ? (JSON.parse(raw) as Basket) : null;
  } catch {
    saved = null;
  }
  const stale = !saved || now - saved.lastAddedAt > BASKET_EXPIRY_MS;
  await commit(stale ? empty(now) : saved!);
  return state;
}

export function hasCode(code: string, basket: Basket = state): boolean {
  return basket.items.some((i) => i.code === code);
}

export async function setBasketActive(active: boolean, now = Date.now()): Promise<void> {
  // Turning it on with an empty basket starts a fresh one.
  if (active && state.items.length === 0) await commit(empty(now, true));
  else await commit({ ...state, active });
}

/** Adds an item unless its barcode is already in the basket. Returns whether it was added. */
export async function addToBasket(item: Omit<BasketItem, "addedAt">, now = Date.now()): Promise<boolean> {
  if (hasCode(item.code)) return false;
  await commit({ ...state, lastAddedAt: now, items: [...state.items, { ...item, addedAt: now }] });
  return true;
}

export async function updateBasketItem(code: string, patch: Partial<Pick<BasketItem, "productName" | "tone">>): Promise<void> {
  if (!hasCode(code)) return;
  await commit({ ...state, items: state.items.map((i) => (i.code === code ? { ...i, ...patch } : i)) });
}

/** Removes an item from the basket only; the scan stays in History. */
export async function removeFromBasket(code: string): Promise<void> {
  await commit({ ...state, items: state.items.filter((i) => i.code !== code) });
}

/** Clears the basket and turns basket mode off. History is untouched. */
export async function finishBasket(now = Date.now()): Promise<void> {
  await commit(empty(now));
}

export function basketCounts(items: BasketItem[]) {
  const counts = { positive: 0, negative: 0, neutral: 0, total: items.length };
  for (const i of items) counts[i.tone] += 1;
  return counts;
}

/** Plain-text summary for the share sheet. No barcodes, to avoid oversharing. */
export function basketShareText(items: BasketItem[]): string {
  const c = basketCounts(items);
  const line = (i: BasketItem) => `• ${i.productName ? `${i.productName} (${i.country})` : i.country}`;
  const section = (title: string, tone: Tone) => {
    const list = items.filter((i) => i.tone === tone);
    return list.length ? [`${title}:`, ...list.map(line)].join("\n") : null;
  };
  return [
    `My basket: ${c.total} item${c.total === 1 ? "" : "s"}. ${c.positive} fine, ${c.negative} to avoid, ${c.neutral} neutral.`,
    section("Avoid", "negative"),
    section("Fine", "positive"),
    section("Neutral", "neutral"),
    "Checked with Solidarity",
  ]
    .filter(Boolean)
    .join("\n\n");
}

/**
 * One camera capture in basket mode: a barcode already in the basket records
 * nothing; a new one is saved as a normal scan, then added to the basket.
 */
export async function recordBasketScan<T extends { record: { id: string } }>(
  input: { code: string; country: string; tone: Tone },
  saveScan: () => Promise<T>,
  now = Date.now()
): Promise<{ status: "duplicate" } | { status: "added"; result: T }> {
  if (hasCode(input.code)) return { status: "duplicate" };
  const result = await saveScan();
  await addToBasket({ scanId: result.record.id, code: input.code, country: input.country, tone: input.tone }, now);
  return { status: "added", result };
}
