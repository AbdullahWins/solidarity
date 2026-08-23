export const colors = {
  bg: "#000000",
  bgElevated: "#0a0a0a",
  panel: "rgba(255, 255, 255, 0.07)",
  panelSoft: "rgba(255, 255, 255, 0.04)",
  panelStrong: "rgba(255, 255, 255, 0.12)",
  border: "rgba(255, 255, 255, 0.14)",
  borderStrong: "rgba(255, 255, 255, 0.22)",
  text: "#f3f4f6",
  subtext: "#9ca3af",
  muted: "#6b7280",
  accent: "#60a5fa",
  accentStrong: "#3b82f6",
  positive: "#86efac",
  positiveStrong: "#22c55e",
  negative: "#fda4af",
  negativeStrong: "#ef4444",
  gold: "#fbbf24",
  goldStrong: "#f59e0b",
} as const;

export const spacing = {
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
  xxl: 24,
  pill: 999,
} as const;

export const typography = {
  display: { fontSize: 32, fontWeight: "800" as const, letterSpacing: 0.2 },
  title: { fontSize: 22, fontWeight: "800" as const },
  heading: { fontSize: 17, fontWeight: "700" as const },
  body: { fontSize: 14, fontWeight: "500" as const },
  caption: { fontSize: 12, fontWeight: "600" as const },
  mono: { fontSize: 13, fontWeight: "600" as const },
} as const;

export const shadow = {
  card: {
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
} as const;
