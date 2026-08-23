import type { Ionicons } from "@expo/vector-icons";
import type React from "react";
import type { GamificationState, ScanRecord } from "./types";

export type BadgeDefinition = {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentProps<typeof Ionicons>["name"];
  check: (scans: ScanRecord[], state: GamificationState) => boolean;
};

const totalScans = (scans: ScanRecord[]) => scans.length;
const positiveScans = (scans: ScanRecord[]) =>
  scans.filter((s) => s.isPositive).length;

const hasScanInHourRange = (scans: ScanRecord[], startHour: number, endHour: number) =>
  scans.some((s) => {
    const hour = new Date(s.scannedAt).getHours();
    return hour >= startHour && hour < endHour;
  });

export const badgeDefinitions: BadgeDefinition[] = [
  {
    id: "first_scan",
    name: "First Step",
    description: "Scanned your very first barcode.",
    icon: "footsteps",
    check: (scans) => totalScans(scans) >= 1,
  },
  {
    id: "scans_10",
    name: "Getting Started",
    description: "Scanned 10 barcodes.",
    icon: "trending-up",
    check: (scans) => totalScans(scans) >= 10,
  },
  {
    id: "scans_50",
    name: "Dedicated Scanner",
    description: "Scanned 50 barcodes.",
    icon: "scan",
    check: (scans) => totalScans(scans) >= 50,
  },
  {
    id: "scans_100",
    name: "Century Club",
    description: "Scanned 100 barcodes.",
    icon: "ribbon",
    check: (scans) => totalScans(scans) >= 100,
  },
  {
    id: "scans_500",
    name: "Power User",
    description: "Scanned 500 barcodes.",
    icon: "flash",
    check: (scans) => totalScans(scans) >= 500,
  },
  {
    id: "streak_3",
    name: "On a Roll",
    description: "Kept a 3-day scanning streak.",
    icon: "flame-outline",
    check: (_scans, state) => state.currentStreak >= 3 || state.longestStreak >= 3,
  },
  {
    id: "streak_7",
    name: "Week Warrior",
    description: "Kept a 7-day scanning streak.",
    icon: "flame",
    check: (_scans, state) => state.currentStreak >= 7 || state.longestStreak >= 7,
  },
  {
    id: "streak_30",
    name: "Iron Will",
    description: "Kept a 30-day scanning streak.",
    icon: "shield-checkmark",
    check: (_scans, state) => state.currentStreak >= 30 || state.longestStreak >= 30,
  },
  {
    id: "streak_100",
    name: "Unstoppable",
    description: "Kept a 100-day scanning streak.",
    icon: "rocket",
    check: (_scans, state) => state.currentStreak >= 100 || state.longestStreak >= 100,
  },
  {
    id: "positive_10",
    name: "Boycott Aware",
    description: "Flagged 10 positive-country scans.",
    icon: "eye",
    check: (scans) => positiveScans(scans) >= 10,
  },
  {
    id: "positive_50",
    name: "Boycott Hero",
    description: "Flagged 50 positive-country scans.",
    icon: "shield",
    check: (scans) => positiveScans(scans) >= 50,
  },
  {
    id: "night_owl",
    name: "Night Owl",
    description: "Scanned something between midnight and 4am.",
    icon: "moon",
    check: (scans) => hasScanInHourRange(scans, 0, 4),
  },
  {
    id: "early_bird",
    name: "Early Bird",
    description: "Scanned something between 5am and 7am.",
    icon: "sunny",
    check: (scans) => hasScanInHourRange(scans, 5, 7),
  },
  {
    id: "level_5",
    name: "Rising Star",
    description: "Reached level 5.",
    icon: "star-outline",
    check: (_scans, state) => state.level >= 5,
  },
  {
    id: "level_10",
    name: "Veteran",
    description: "Reached level 10.",
    icon: "star-half",
    check: (_scans, state) => state.level >= 10,
  },
  {
    id: "level_25",
    name: "Legend",
    description: "Reached level 25.",
    icon: "star",
    check: (_scans, state) => state.level >= 25,
  },
];
