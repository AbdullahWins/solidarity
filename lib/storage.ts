import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  DEFAULT_GAMIFICATION_STATE,
  type GamificationState,
  type ScanRecord,
} from "./types";

const KEYS = {
  scans: "solidarity:v1:scans",
  gamification: "solidarity:v1:gamification",
  meta: "solidarity:v1:meta",
} as const;

const MAX_STORED_SCANS = 5000;

type Meta = {
  schemaVersion: number;
  installId: string;
  createdAt: string;
};

const randomId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export async function getScans(): Promise<ScanRecord[]> {
  const raw = await AsyncStorage.getItem(KEYS.scans);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as ScanRecord[];
  } catch {
    return [];
  }
}

export async function addScan(record: ScanRecord): Promise<ScanRecord[]> {
  const current = await getScans();
  const next = [record, ...current].slice(0, MAX_STORED_SCANS);
  await AsyncStorage.setItem(KEYS.scans, JSON.stringify(next));
  return next;
}

/** Product details that can be added to a scan after it was recorded. */
export type ProductPatch = Partial<Pick<ScanRecord, "productName" | "brand" | "owner" | "categories" | "brandRule">>;

/** Patches one stored scan (e.g. product details that arrive after the scan). */
export async function updateScan(
  id: string,
  patch: ProductPatch
): Promise<ScanRecord[]> {
  const current = await getScans();
  const next = current.map((s) => (s.id === id ? { ...s, ...patch } : s));
  await AsyncStorage.setItem(KEYS.scans, JSON.stringify(next));
  return next;
}

/** Replaces the whole scan list (backup import). */
export async function replaceScans(scans: ScanRecord[]): Promise<void> {
  await AsyncStorage.setItem(KEYS.scans, JSON.stringify(scans.slice(0, MAX_STORED_SCANS)));
}

export async function clearScans(): Promise<void> {
  await AsyncStorage.removeItem(KEYS.scans);
}

export async function getGamificationState(): Promise<GamificationState> {
  const raw = await AsyncStorage.getItem(KEYS.gamification);
  if (!raw) return DEFAULT_GAMIFICATION_STATE;
  try {
    return { ...DEFAULT_GAMIFICATION_STATE, ...(JSON.parse(raw) as GamificationState) };
  } catch {
    return DEFAULT_GAMIFICATION_STATE;
  }
}

export async function saveGamificationState(state: GamificationState): Promise<void> {
  await AsyncStorage.setItem(KEYS.gamification, JSON.stringify(state));
}

export async function clearGamificationState(): Promise<void> {
  await AsyncStorage.removeItem(KEYS.gamification);
}

export async function getMeta(): Promise<Meta> {
  const raw = await AsyncStorage.getItem(KEYS.meta);
  if (raw) {
    try {
      return JSON.parse(raw) as Meta;
    } catch {
      // fall through to create a fresh one
    }
  }
  const meta: Meta = {
    schemaVersion: 1,
    installId: randomId(),
    createdAt: new Date().toISOString(),
  };
  await AsyncStorage.setItem(KEYS.meta, JSON.stringify(meta));
  return meta;
}

export function generateScanId(): string {
  return randomId();
}
