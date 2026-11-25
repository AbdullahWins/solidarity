import { Platform } from "react-native";

import type { LeaderboardEntry } from "./cloudSync";

// Demo mode exists only so scripts/screenshots.mjs can capture populated,
// deterministic screens from the web build. It requires web AND an explicit
// localStorage flag, so native builds can never enter it.
export const DEMO_FLAG_KEY = "solidarity:demo";

export function isDemoEnabled(platform: string, storageValue: string | null | undefined): boolean {
  return platform === "web" && storageValue === "1";
}

export function isDemo(): boolean {
  if (Platform.OS !== "web") return false;
  try {
    return isDemoEnabled(Platform.OS, globalThis.localStorage?.getItem(DEMO_FLAG_KEY));
  } catch {
    return false;
  }
}

export const DEMO_USER = {
  uid: "demo-user",
  email: "nadia@example.com",
  displayName: "Nadia Rahman",
  emailVerified: true,
};

export const DEMO_LEADERBOARD: LeaderboardEntry[] = [
  { uid: "u1", displayName: "Amira K.", xp: 9840, level: 14, currentStreak: 41, longestStreak: 63 },
  { uid: "u2", displayName: "Jonas Weber", xp: 7310, level: 12, currentStreak: 18, longestStreak: 30 },
  { uid: "u3", displayName: "Lucía", xp: 6155, level: 11, currentStreak: 9, longestStreak: 25 },
  { uid: "demo-user", displayName: "Nadia Rahman", xp: 2905, level: 7, currentStreak: 6, longestStreak: 12 },
  { uid: "u5", displayName: "Tariq", xp: 2215, level: 6, currentStreak: 3, longestStreak: 14 },
  { uid: "u6", displayName: "Mei Chen", xp: 1890, level: 6, currentStreak: 0, longestStreak: 9 },
  { uid: "u7", displayName: "Oskar", xp: 1320, level: 5, currentStreak: 2, longestStreak: 7 },
  { uid: "u8", displayName: "Fatima Z.", xp: 960, level: 4, currentStreak: 1, longestStreak: 5 },
];

/** Product details shown for the screenshot script's typed codes (no network). */
export const DEMO_PRODUCTS: Record<string, { name: string; brand: string; owner?: string; categories?: string[] }> = {
  "5601234567892": { name: "Extra virgin olive oil 750 ml", brand: "Quinta do Vale" },
  "4006381333931": { name: "Textmarker highlighter, yellow", brand: "Stabilo", owner: "Schwan-Stabilo Group" },
  "6901234567892": { name: "Dark chocolate bar 85%", brand: "Demo Cocoa", categories: ["en:dark-chocolates"] },
  // Store-image products: fictional brands, neutral examples.
  "8941234567896": { name: "Premium black tea 400 g", brand: "Chayana" },
  "4001234567891": { name: "Dark chocolate bar 85%", brand: "Nocturo", categories: ["en:dark-chocolates"] },
  "4501234567896": { name: "Matcha green tea 100 g", brand: "Kirakoi", owner: "Aokawa Foods Group" },
};
