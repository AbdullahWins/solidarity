import * as DocumentPicker from "expo-document-picker";
import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import { Platform } from "react-native";

import { backupFileName, BackupError, buildBackup, mergeBackup, parseBackup, type Backup } from "./backup";
import { getCachedRules, mergeRules } from "./countryRules";
import { getPreferences } from "./preferences";
import { getGamificationState, getScans, replaceScans, saveGamificationState } from "./storage";

/** Writes a backup file and opens the share sheet (a download on web). */
export async function exportBackup(): Promise<void> {
  const [scans, gamification, preferences] = await Promise.all([getScans(), getGamificationState(), getPreferences()]);
  const json = JSON.stringify(buildBackup({ scans, gamification, rules: getCachedRules(), preferences }), null, 1);
  const name = backupFileName();

  if (Platform.OS === "web") {
    const url = URL.createObjectURL(new Blob([json], { type: "application/json" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return;
  }

  const file = new File(Paths.cache, name);
  if (file.exists) file.delete();
  file.create();
  await file.write(json);
  if (!(await Sharing.isAvailableAsync())) throw new BackupError("Sharing isn't available on this device.");
  await Sharing.shareAsync(file.uri, { mimeType: "application/json", dialogTitle: "Save your Solidarity backup", UTI: "public.json" });
}

/** Lets the user pick a backup file. Resolves null if they cancel; throws BackupError if it's invalid. */
export async function pickBackup(): Promise<Backup | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: ["application/json", "text/plain", "*/*"],
    copyToCacheDirectory: true,
    multiple: false,
  });
  if (result.canceled || !result.assets?.[0]) return null;
  const asset = result.assets[0];
  if (asset.size !== undefined && asset.size > 10 * 1024 * 1024) {
    throw new BackupError("This file is too large to be a Solidarity backup.");
  }
  const text = Platform.OS === "web" && asset.file ? await asset.file.text() : await new File(asset.uri).text();
  return parseBackup(text, asset.size ?? text.length);
}

/** Merges a validated backup into this device. */
export async function applyBackup(backup: Backup): Promise<{ added: number; rules: number }> {
  const [scans, gamification] = await Promise.all([getScans(), getGamificationState()]);
  const merged = mergeBackup({ scans, gamification }, backup);
  await replaceScans(merged.scans);
  await saveGamificationState(merged.gamification);
  const before = Object.keys(getCachedRules()).length;
  await mergeRules(backup.rules);
  return { added: merged.added, rules: Object.keys(getCachedRules()).length - before };
}

// The picked backup, handed from Settings to the preview screen.
let pending: Backup | null = null;
export const setPendingImport = (b: Backup | null) => {
  pending = b;
};
export const getPendingImport = () => pending;
