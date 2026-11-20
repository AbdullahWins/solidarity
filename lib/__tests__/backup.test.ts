import { buildBackup, BackupError, mergeBackup, parseBackup, MAX_BACKUP_BYTES } from "../backup";
import { computeGamificationState } from "../gamification";
import { DEFAULT_PREFERENCES } from "../preferences";
import { DEFAULT_GAMIFICATION_STATE, type ScanRecord } from "../types";

jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock")
);

const scan = (id: string, daysAgo: number, extra: Partial<ScanRecord> = {}): ScanRecord => ({
  id,
  code: "4006381333931",
  country: "Germany",
  isPositive: true,
  source: "camera",
  scannedAt: new Date(Date.UTC(2026, 10, 20 - daysAgo, 12)).toISOString(),
  ...extra,
});

const sourceScans = [scan("a", 0, { rule: "support", productName: "Pen", brand: "Stabilo" }), scan("b", 1), scan("c", 2)];
const sourceState = { ...computeGamificationState(sourceScans), voteXp: 40, voteCount: 4 };
const file = () =>
  JSON.stringify(
    buildBackup({
      scans: sourceScans,
      gamification: { ...sourceState, xp: sourceState.xp + 40 },
      rules: { germany: "support", france: "avoid" },
      preferences: DEFAULT_PREFERENCES,
    })
  );

test("round trip onto an empty device restores scans and progress", () => {
  const backup = parseBackup(file());
  const merged = mergeBackup({ scans: [], gamification: DEFAULT_GAMIFICATION_STATE }, backup);
  expect(merged.scans.map((s) => s.id)).toEqual(["a", "b", "c"]);
  expect(merged.scans[0]).toMatchObject({ rule: "support", productName: "Pen", brand: "Stabilo" });
  expect(merged.gamification.voteXp).toBe(40);
  expect(merged.gamification.xp).toBe(computeGamificationState(sourceScans).xp + 40);
  expect(merged.added).toBe(3);
});

test("importing the same file twice adds nothing", () => {
  const backup = parseBackup(file());
  const once = mergeBackup({ scans: [], gamification: DEFAULT_GAMIFICATION_STATE }, backup);
  const twice = mergeBackup(once, backup);
  expect(twice.scans).toHaveLength(3);
  expect(twice.added).toBe(0);
});

test("inflated XP in the file is ignored; progress comes from the scans", () => {
  const tampered = JSON.parse(file());
  tampered.gamification.xp = 999999;
  tampered.gamification.level = 50;
  const merged = mergeBackup({ scans: [], gamification: DEFAULT_GAMIFICATION_STATE }, parseBackup(JSON.stringify(tampered)));
  expect(merged.gamification.xp).toBeLessThan(1000);
});

test("rejects files that aren't a Solidarity backup", () => {
  expect(() => parseBackup("{}")).toThrow(BackupError);
  expect(() => parseBackup("not json")).toThrow("This isn't a Solidarity backup.");
  expect(() => parseBackup(JSON.stringify({ name: "other app" }))).toThrow("This isn't a Solidarity backup.");
});

test("rejects other versions, damaged scans and oversize files", () => {
  const other = { ...JSON.parse(file()), version: 2 };
  expect(() => parseBackup(JSON.stringify(other))).toThrow(/different version/);
  const damaged = JSON.parse(file());
  damaged.scans[0].code = "not-a-barcode";
  expect(() => parseBackup(JSON.stringify(damaged))).toThrow(/damaged/);
  const badRule = JSON.parse(file());
  badRule.rules = { germany: "boycott-everything" };
  expect(() => parseBackup(JSON.stringify(badRule))).toThrow(/damaged/);
  expect(() => parseBackup(file(), MAX_BACKUP_BYTES + 1)).toThrow(/too large/);
});

test("unknown scan fields are dropped", () => {
  const extra = JSON.parse(file());
  extra.scans[0].injected = "<script>";
  const backup = parseBackup(JSON.stringify(extra));
  expect(Object.keys(backup.scans[0])).not.toContain("injected");
});

test("scans read from a photo are accepted", () => {
  const withPhoto = JSON.parse(file());
  withPhoto.scans.push(scan("p", 4, { source: "photo" }));
  expect(parseBackup(JSON.stringify(withPhoto)).scans.map((s) => s.source)).toContain("photo");
});
