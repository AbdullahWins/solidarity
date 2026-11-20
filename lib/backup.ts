import { computeGamificationState } from "./gamification";
import type { Preferences } from "./preferences";
import { DEFAULT_GAMIFICATION_STATE, type GamificationState, type ScanRecord } from "./types";

/**
 * Backup without an account: a versioned JSON file of everything that lives
 * only on the device. Progress (XP, streaks, badges) is never trusted from the
 * file; it is recomputed from the merged scans, so editing a file can't
 * inflate it beyond what the scans justify.
 */

export const BACKUP_APP = "solidarity";
export const BACKUP_VERSION = 1;
export const MAX_BACKUP_BYTES = 10 * 1024 * 1024;
const MAX_SCANS = 5000;

type Rule = "avoid" | "support";

export type Backup = {
  app: typeof BACKUP_APP;
  version: typeof BACKUP_VERSION;
  exportedAt: string;
  scans: ScanRecord[];
  gamification: Pick<GamificationState, "voteXp" | "voteCount" | "badgeUnlockedAt">;
  rules: Record<string, Rule>;
  preferences: Partial<Preferences>;
};

export class BackupError extends Error {}

export function buildBackup(input: {
  scans: ScanRecord[];
  gamification: GamificationState;
  rules: Record<string, Rule>;
  preferences: Preferences;
  now?: Date;
}): Backup {
  return {
    app: BACKUP_APP,
    version: BACKUP_VERSION,
    exportedAt: (input.now ?? new Date()).toISOString(),
    scans: input.scans,
    gamification: {
      voteXp: input.gamification.voteXp,
      voteCount: input.gamification.voteCount,
      badgeUnlockedAt: input.gamification.badgeUnlockedAt,
    },
    rules: input.rules,
    preferences: input.preferences,
  };
}

export const backupFileName = (now = new Date()) => `solidarity-backup-${now.toLocaleDateString("en-CA")}.json`;

const isString = (v: unknown): v is string => typeof v === "string";
const isNonNegInt = (v: unknown): v is number => typeof v === "number" && Number.isInteger(v) && v >= 0;

function validScan(v: unknown): v is ScanRecord {
  const s = v as Partial<ScanRecord> | null;
  return (
    !!s &&
    isString(s.id) &&
    s.id.length <= 64 &&
    isString(s.code) &&
    /^\d{8,14}$/.test(s.code) &&
    isString(s.country) &&
    s.country.length <= 64 &&
    typeof s.isPositive === "boolean" &&
    (s.source === "camera" || s.source === "manual" || s.source === "photo") &&
    isString(s.scannedAt) &&
    !Number.isNaN(Date.parse(s.scannedAt)) &&
    (s.rule === undefined || s.rule === "avoid" || s.rule === "support") &&
    (s.productName === undefined || (isString(s.productName) && s.productName.length <= 200)) &&
    (s.brand === undefined || (isString(s.brand) && s.brand.length <= 200))
  );
}

/** Parses and validates a backup file. Throws BackupError with a user-facing message. */
export function parseBackup(text: string, sizeBytes = text.length): Backup {
  if (sizeBytes > MAX_BACKUP_BYTES) throw new BackupError("This file is too large to be a Solidarity backup.");
  let data: Partial<Backup>;
  try {
    data = JSON.parse(text) as Partial<Backup>;
  } catch {
    throw new BackupError("This isn't a Solidarity backup.");
  }
  if (!data || data.app !== BACKUP_APP) throw new BackupError("This isn't a Solidarity backup.");
  if (data.version !== BACKUP_VERSION) {
    throw new BackupError("This backup was made by a different version of Solidarity. Update the app and try again.");
  }
  if (!Array.isArray(data.scans) || data.scans.length > MAX_SCANS || !data.scans.every(validScan)) {
    throw new BackupError("This backup is damaged and can't be imported.");
  }
  const g = data.gamification ?? ({} as Backup["gamification"]);
  const rules = data.rules ?? {};
  if (
    !isNonNegInt(g.voteXp ?? 0) ||
    !isNonNegInt(g.voteCount ?? 0) ||
    typeof rules !== "object" ||
    !Object.entries(rules).every(([k, v]) => /^[a-z0-9-]{1,64}$/.test(k) && (v === "avoid" || v === "support"))
  ) {
    throw new BackupError("This backup is damaged and can't be imported.");
  }
  // Keep only the scan fields we know about.
  const scans = data.scans.map(
    ({ id, code, country, isPositive, source, scannedAt, rule, productName, brand }) =>
      ({ id, code, country, isPositive, source, scannedAt, rule, productName, brand }) as ScanRecord
  );
  return {
    app: BACKUP_APP,
    version: BACKUP_VERSION,
    exportedAt: isString(data.exportedAt) ? data.exportedAt : "",
    scans: scans.map((s) => Object.fromEntries(Object.entries(s).filter(([, v]) => v !== undefined)) as ScanRecord),
    gamification: { voteXp: g.voteXp ?? 0, voteCount: g.voteCount ?? 0, badgeUnlockedAt: g.badgeUnlockedAt ?? {} },
    rules,
    preferences: typeof data.preferences === "object" && data.preferences ? data.preferences : {},
  };
}

export function backupSummary(backup: Backup) {
  return {
    scans: backup.scans.length,
    rules: Object.keys(backup.rules).length,
    exportedAt: backup.exportedAt,
  };
}

/**
 * Merges a backup into local data: scans deduplicated by id (newest first,
 * capped), progress recomputed from the merged scans keeping the higher vote
 * XP and count. Rules are merged separately (lib/countryRules mergeRules),
 * which never overwrites a local rule.
 */
export function mergeBackup(
  local: { scans: ScanRecord[]; gamification: GamificationState },
  backup: Backup
): { scans: ScanRecord[]; gamification: GamificationState; added: number } {
  const byId = new Map(local.scans.map((s) => [s.id, s]));
  let added = 0;
  for (const s of backup.scans) {
    if (!byId.has(s.id)) {
      byId.set(s.id, s);
      added += 1;
    }
  }
  const scans = [...byId.values()]
    .sort((a, b) => Date.parse(b.scannedAt) - Date.parse(a.scannedAt))
    .slice(0, MAX_SCANS);
  const previous: GamificationState = {
    ...DEFAULT_GAMIFICATION_STATE,
    ...local.gamification,
    voteXp: Math.max(local.gamification.voteXp, backup.gamification.voteXp),
    voteCount: Math.max(local.gamification.voteCount, backup.gamification.voteCount),
    // Earliest known unlock time wins, so badges keep their original dates.
    badgeUnlockedAt: { ...backup.gamification.badgeUnlockedAt, ...local.gamification.badgeUnlockedAt },
  };
  return { scans, gamification: computeGamificationState(scans, previous), added };
}
