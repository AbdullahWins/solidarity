import { Ionicons } from "@expo/vector-icons";
import { CameraView, type BarcodeScanningResult } from "expo-camera";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

import { colors, radius, spacing, typography } from "../../constants/theme";
import { IconButton } from "../ui/IconButton";

type Props = {
  active: boolean;
  scanning: boolean;
  height: number;
  onScanned: (result: BarcodeScanningResult) => void;
  /** Web: decorative viewfinder with a sample barcode instead of the camera. */
  preview?: boolean;
};

const BARCODE_TYPES = ["ean13", "ean8", "upc_a", "upc_e"] as const;

// Bar widths for the decorative sample barcode (preview mode).
const BARS = [3, 1, 2, 1, 1, 3, 2, 1, 1, 2, 3, 1, 2, 2, 1, 1, 3, 1, 2, 1, 1, 2, 3, 1, 1, 2, 1, 3, 1, 2];

function SampleBarcode() {
  return (
    <View style={styles.sample} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <View style={styles.sampleBars}>
        {BARS.map((w, i) => (
          <View key={i} style={{ width: w * 2.2, marginRight: i % 2 ? 2.2 : 1.4, backgroundColor: "#15171C" }} />
        ))}
      </View>
      <Text style={styles.sampleDigits}>5 601234 567892</Text>
    </View>
  );
}

function Corner({ style }: { style: object }) {
  return <View style={[styles.corner, style]} />;
}

/** Camera preview with animated scan line, corner guides and torch toggle. */
export function Viewfinder({ active, scanning, height, onScanned, preview }: Props) {
  const [torch, setTorch] = useState(false);
  const [mountError, setMountError] = useState<string | null>(null);
  const line = useSharedValue(0);
  const animate = (active || !!preview) && scanning;

  useEffect(() => {
    if (animate) {
      line.set(0);
      line.set(withRepeat(withTiming(1, { duration: 1800, easing: Easing.inOut(Easing.quad) }), -1, true));
    } else {
      cancelAnimation(line);
    }
    return () => cancelAnimation(line);
  }, [animate, line]);

  const windowHeight = Math.min(height * 0.62, 220);
  const lineStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: line.get() * (windowHeight - 4) }],
    opacity: scanning ? 1 : 0,
  }));

  const statusText = preview ? "Camera scanning works in the app" : scanning ? "Point at a barcode" : "Captured";

  return (
    <View style={[styles.frame, { height }]}>
      {preview ? (
        <View style={[StyleSheet.absoluteFill, styles.center]}>
          <LinearGradient
            colors={["#2D323D", "#181B22", "#0C0E12"]}
            start={{ x: 0.2, y: 0 }}
            end={{ x: 0.8, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <SampleBarcode />
        </View>
      ) : active && !mountError ? (
        <CameraView
          style={StyleSheet.absoluteFill}
          facing="back"
          enableTorch={torch}
          autofocus="on"
          barcodeScannerSettings={{ barcodeTypes: [...BARCODE_TYPES] }}
          onBarcodeScanned={scanning ? onScanned : undefined}
          onMountError={(e) => setMountError(e.message || "Camera unavailable")}
          accessibilityLabel="Camera preview"
        />
      ) : (
        <View style={[StyleSheet.absoluteFill, styles.placeholder]}>
          {mountError ? (
            <>
              <Ionicons name="videocam-off-outline" size={28} color={colors.subtext} />
              <Text style={styles.placeholderText}>Camera unavailable. Type the barcode below instead.</Text>
            </>
          ) : null}
        </View>
      )}

      {!mountError ? (
        <View pointerEvents="none" style={styles.overlay}>
          <View style={[styles.window, { height: windowHeight }]}>
            <Corner style={styles.tl} />
            <Corner style={styles.tr} />
            <Corner style={styles.bl} />
            <Corner style={styles.br} />
            <Animated.View style={[styles.line, lineStyle]} />
          </View>
        </View>
      ) : null}

      <View style={styles.topBar} pointerEvents="box-none">
        <View style={styles.statusChip}>
          <View style={[styles.statusDot, { backgroundColor: scanning ? colors.positive : colors.gold }]} />
          <Text style={styles.statusText}>{statusText}</Text>
        </View>
        {active && !mountError && !preview ? (
          <IconButton
            icon={torch ? "flashlight" : "flashlight-outline"}
            onPress={() => setTorch((v) => !v)}
            accessibilityLabel={torch ? "Turn torch off" : "Turn torch on"}
            active={torch}
            size={44}
            style={styles.torch}
          />
        ) : null}
      </View>
    </View>
  );
}

const CORNER = 28;
const THICK = 3.5;

const styles = StyleSheet.create({
  frame: {
    borderRadius: radius.xxl,
    overflow: "hidden",
    backgroundColor: "#000",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderStrong,
  },
  center: {
    alignItems: "center",
    justifyContent: "center",
  },
  sample: {
    backgroundColor: "#F4F1EA",
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 6,
    alignItems: "center",
    transform: [{ rotate: "-3deg" }],
    shadowColor: "#000",
    shadowOpacity: 0.55,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
  },
  sampleBars: {
    flexDirection: "row",
    height: 58,
  },
  sampleDigits: {
    ...typography.mono,
    color: "#15171C",
    letterSpacing: 2,
    marginTop: 4,
  },
  placeholder: {
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    padding: spacing.xl,
    backgroundColor: colors.surface,
  },
  placeholderText: {
    ...typography.body,
    color: colors.subtext,
    textAlign: "center",
  },
  overlay: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0, 0, 0, 0.16)",
  },
  window: {
    width: "78%",
    maxWidth: 420,
  },
  corner: {
    position: "absolute",
    width: CORNER,
    height: CORNER,
    borderColor: "#FFFFFF",
  },
  tl: { top: 0, left: 0, borderTopWidth: THICK, borderLeftWidth: THICK, borderTopLeftRadius: 14 },
  tr: { top: 0, right: 0, borderTopWidth: THICK, borderRightWidth: THICK, borderTopRightRadius: 14 },
  bl: { bottom: 0, left: 0, borderBottomWidth: THICK, borderLeftWidth: THICK, borderBottomLeftRadius: 14 },
  br: { bottom: 0, right: 0, borderBottomWidth: THICK, borderRightWidth: THICK, borderBottomRightRadius: 14 },
  line: {
    position: "absolute",
    left: 10,
    right: 10,
    height: 3,
    borderRadius: 2,
    backgroundColor: colors.brand,
    shadowColor: colors.brand,
    shadowOpacity: 0.9,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
  },
  topBar: {
    position: "absolute",
    top: spacing.md,
    left: spacing.md,
    right: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  statusChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs + 2,
    backgroundColor: "rgba(7, 8, 11, 0.74)",
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  statusText: {
    ...typography.caption,
    color: colors.text,
  },
  torch: {
    backgroundColor: "rgba(7, 8, 11, 0.74)",
  },
});
