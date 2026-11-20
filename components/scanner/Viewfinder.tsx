import { Ionicons } from "@expo/vector-icons";
import { CameraView, type BarcodeScanningResult } from "expo-camera";
import React, { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  cancelAnimation,
} from "react-native-reanimated";

import { colors, radius, spacing, typography } from "../../constants/theme";
import { IconButton } from "../ui/IconButton";

type Props = {
  active: boolean;
  scanning: boolean;
  height: number;
  onScanned: (result: BarcodeScanningResult) => void;
};

const BARCODE_TYPES = ["ean13", "ean8", "upc_a", "upc_e"] as const;

function Corner({ style }: { style: object }) {
  return <View style={[styles.corner, style]} />;
}

/** Camera preview with animated scan line, corner guides and torch toggle. */
export function Viewfinder({ active, scanning, height, onScanned }: Props) {
  const [torch, setTorch] = useState(false);
  const [mountError, setMountError] = useState<string | null>(null);
  const line = useSharedValue(0);

  useEffect(() => {
    if (active && scanning) {
      line.value = 0;
      line.value = withRepeat(withTiming(1, { duration: 1800, easing: Easing.inOut(Easing.quad) }), -1, true);
    } else {
      cancelAnimation(line);
    }
    return () => cancelAnimation(line);
  }, [active, scanning, line]);

  const windowHeight = Math.min(height * 0.62, 220);
  const lineStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: line.value * (windowHeight - 4) }],
    opacity: scanning ? 1 : 0,
  }));

  return (
    <View style={[styles.frame, { height }]}>
      {active && !mountError ? (
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
          <Text style={styles.statusText}>{scanning ? "Point at a barcode" : "Captured"}</Text>
        </View>
        {active && !mountError ? (
          <IconButton
            icon={torch ? "flashlight" : "flashlight-outline"}
            onPress={() => setTorch((v) => !v)}
            accessibilityLabel={torch ? "Turn torch off" : "Turn torch on"}
            active={torch}
            size={40}
            style={styles.torch}
          />
        ) : null}
      </View>
    </View>
  );
}

const CORNER = 26;
const THICK = 3.5;

const styles = StyleSheet.create({
  frame: {
    borderRadius: radius.xxl,
    overflow: "hidden",
    backgroundColor: "#000",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderStrong,
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
    backgroundColor: "rgba(0, 0, 0, 0.18)",
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
  tl: { top: 0, left: 0, borderTopWidth: THICK, borderLeftWidth: THICK, borderTopLeftRadius: 12 },
  tr: { top: 0, right: 0, borderTopWidth: THICK, borderRightWidth: THICK, borderTopRightRadius: 12 },
  bl: { bottom: 0, left: 0, borderBottomWidth: THICK, borderLeftWidth: THICK, borderBottomLeftRadius: 12 },
  br: { bottom: 0, right: 0, borderBottomWidth: THICK, borderRightWidth: THICK, borderBottomRightRadius: 12 },
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
    backgroundColor: "rgba(7, 8, 11, 0.72)",
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
    backgroundColor: "rgba(7, 8, 11, 0.72)",
  },
});
