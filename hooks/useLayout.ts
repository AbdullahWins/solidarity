import { useWindowDimensions } from "react-native";

export type LayoutInfo = {
  width: number;
  height: number;
  isLandscape: boolean;
  /** Tablet-class width (>= 700dp) in any orientation. */
  isWide: boolean;
  /** Navigation renders as a side rail instead of a bottom bar. */
  useRail: boolean;
  /** Suggested grid column count for card lists. */
  columns: 1 | 2 | 3;
  /** Horizontal page gutter. */
  gutter: number;
};

// Breakpoints (dp). Window size, not screen size, so split-screen,
// Stage Manager, foldables and desktop windows all get the right layout.
export function computeLayout(width: number, height: number): LayoutInfo {
  const isLandscape = width > height;
  const isWide = width >= 700;
  const useRail = isWide || isLandscape;
  // Content width once a rail (~88dp) is taken out.
  const contentWidth = useRail ? width - 88 : width;
  const columns: 1 | 2 | 3 = contentWidth >= 1000 ? 3 : contentWidth >= 560 ? 2 : 1;
  const gutter = width >= 1000 ? 32 : width >= 600 ? 24 : 16;
  return { width, height, isLandscape, isWide, useRail, columns, gutter };
}

export function useLayout(): LayoutInfo {
  const { width, height } = useWindowDimensions();
  return computeLayout(width, height);
}
