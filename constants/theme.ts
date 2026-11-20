import { Platform } from "react-native";

// Dark-only design tokens. The app declares userInterfaceStyle "dark", so the
// system chrome (status bar, keyboard, alerts) always matches these surfaces.
export const colors = {
  bg: "#07080B",
  bgElevated: "#0E1015",
  surface: "#12151C",
  surfaceHigh: "#1A1E27",
  panel: "rgba(255, 255, 255, 0.045)",
  panelSoft: "rgba(255, 255, 255, 0.03)",
  panelStrong: "rgba(255, 255, 255, 0.09)",
  border: "rgba(255, 255, 255, 0.08)",
  borderStrong: "rgba(255, 255, 255, 0.16)",
  overlay: "rgba(3, 4, 6, 0.78)",

  text: "#F5F7FA",
  subtext: "#A3AAB8",
  muted: "#6B7280",

  brand: "#F0643C",
  brandSoft: "#FF8A65",
  brandDeep: "#C8463A",

  accent: "#8EA6FF",
  accentStrong: "#6D88FA",
  onAccent: "#FFFFFF",

  positive: "#4ADE9B",
  positiveStrong: "#22C55E",
  negative: "#FB7185",
  negativeStrong: "#F43F5E",
  gold: "#FBBF24",
  goldStrong: "#F59E0B",

  tierBronze: "#D08A55",
  tierSilver: "#CBD2DC",
  tierGold: "#FBBF24",
  tierPlatinum: "#7DD3FC",
  tierDiamond: "#C4B5FD",
} as const;

export const gradients = {
  brand: ["#F47A4E", "#D9493A"] as const,
  hero: ["rgba(240, 100, 60, 0.20)", "rgba(109, 136, 250, 0.10)", "rgba(7, 8, 11, 0)"] as const,
  accent: ["#8EA6FF", "#6D88FA"] as const,
  gold: ["rgba(251, 191, 36, 0.22)", "rgba(251, 191, 36, 0.02)"] as const,
  positive: ["rgba(74, 222, 155, 0.18)", "rgba(74, 222, 155, 0.02)"] as const,
  negative: ["rgba(251, 113, 133, 0.18)", "rgba(251, 113, 133, 0.02)"] as const,
  surface: ["#151922", "#0F1218"] as const,
};

export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
  xxxl: 40,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 26,
  pill: 999,
} as const;

const tabular = { fontVariant: ["tabular-nums" as const] };

export const typography = {
  hero: { fontSize: 40, fontWeight: "800" as const, letterSpacing: -0.8, ...tabular },
  display: { fontSize: 30, fontWeight: "800" as const, letterSpacing: -0.5, ...tabular },
  title: { fontSize: 22, fontWeight: "700" as const, letterSpacing: -0.3 },
  heading: { fontSize: 17, fontWeight: "700" as const, letterSpacing: -0.2 },
  body: { fontSize: 15, fontWeight: "500" as const, lineHeight: 21 },
  bodyStrong: { fontSize: 15, fontWeight: "700" as const },
  caption: { fontSize: 12.5, fontWeight: "600" as const },
  overline: {
    fontSize: 11,
    fontWeight: "700" as const,
    letterSpacing: 1.1,
    textTransform: "uppercase" as const,
  },
  stat: { fontSize: 24, fontWeight: "800" as const, letterSpacing: -0.4, ...tabular },
  mono: {
    fontSize: 13,
    fontWeight: "600" as const,
    fontFamily: Platform.select({ ios: "Menlo", android: "monospace", default: "monospace" }),
    ...tabular,
  },
} as const;

export const shadow = {
  card: Platform.select({
    ios: {
      shadowColor: "#000",
      shadowOpacity: 0.35,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: 10 },
    },
    default: { elevation: 6 },
  }),
  glow: (color: string) =>
    Platform.select({
      ios: { shadowColor: color, shadowOpacity: 0.45, shadowRadius: 16, shadowOffset: { width: 0, height: 6 } },
      default: { elevation: 8 },
    }),
};

export const layout = {
  /** Minimum comfortable touch target (iOS HIG 44pt, Material 48dp). */
  touch: 44,
  /** Readable column width for single-column screens. */
  readable: 760,
  /** Max width for grid screens on large tablets. */
  wide: 1180,
} as const;
