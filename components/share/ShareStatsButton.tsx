import * as MediaLibrary from "expo-media-library";
import * as Sharing from "expo-sharing";
import React, { useMemo, useRef, useState } from "react";
import { Alert, Platform, StyleSheet, View } from "react-native";
import ViewShot, { type ViewShotRef } from "react-native-view-shot";

import { spacing } from "../../constants/theme";
import { buildDailyCounts } from "../../lib/gamification";
import type { GamificationState, ScanRecord } from "../../lib/types";
import { Button } from "../ui/Button";
import { IconButton } from "../ui/IconButton";
import { StatsShareCard } from "./StatsShareCard";

type Props = {
  scans: ScanRecord[];
  gamification: GamificationState;
  stats: { total: number; positive: number; negative: number };
};

export function ShareStatsButton({ scans, gamification, stats }: Props) {
  const shotRef = useRef<ViewShotRef>(null);
  const [busy, setBusy] = useState<"share" | "save" | null>(null);
  const dailyCounts = useMemo(() => buildDailyCounts(scans), [scans]);
  // Only mount the off-screen card while capturing, so it isn't laid out and
  // rasterised on every render of Stats/Profile.
  const [mounted, setMounted] = useState(false);
  const readyRef = useRef<(() => void) | null>(null);

  const capture = async (): Promise<string | null> => {
    // Wait until the card's logo has decoded (or 1.5s), then one more frame.
    const ready = new Promise<void>((resolve) => {
      readyRef.current = resolve;
      setTimeout(resolve, 1500);
    });
    setMounted(true);
    await ready;
    await new Promise((r) => requestAnimationFrame(() => r(null)));
    try {
      return (await shotRef.current?.capture?.()) ?? null;
    } catch {
      return null;
    }
  };

  const handleShare = async () => {
    if (busy) return;
    setBusy("share");
    try {
      const uri = await capture();
      if (!uri) throw new Error("capture");
      if (!(await Sharing.isAvailableAsync())) {
        Alert.alert("Sharing unavailable", "Sharing isn't available on this device.");
        return;
      }
      await Sharing.shareAsync(uri, { mimeType: "image/png", UTI: "public.png", dialogTitle: "Share your stats" });
    } catch {
      Alert.alert("Couldn't share", "Something went wrong while creating your stats image.");
    } finally {
      setBusy(null);
      setMounted(false);
    }
  };

  const handleSave = async () => {
    if (busy) return;
    setBusy("save");
    try {
      // Write-only access: no read permission on Android 13+, add-only on iOS.
      const permission = await MediaLibrary.requestPermissionsAsync(true);
      if (!permission.granted) {
        Alert.alert("Permission needed", "Allow Solidarity to add photos so it can save your stats image.");
        return;
      }
      const uri = await capture();
      if (!uri) throw new Error("capture");
      // SDK 58: the legacy saveToLibraryAsync now throws at runtime.
      await MediaLibrary.Asset.create(uri);
      Alert.alert("Saved", "Your stats image is in your photos.");
    } catch {
      Alert.alert("Couldn't save", "Something went wrong while saving your stats image.");
    } finally {
      setBusy(null);
      setMounted(false);
    }
  };

  return (
    <>
      <View style={styles.row}>
        <Button
          label={busy === "share" ? "Preparing…" : "Share my stats"}
          icon="share-social"
          variant="brand"
          onPress={handleShare}
          loading={busy === "share"}
          style={styles.share}
        />
        {Platform.OS !== "web" ? (
          <IconButton icon="download-outline" onPress={handleSave} accessibilityLabel="Save stats image to photos" size={48} />
        ) : null}
      </View>

      {mounted ? (
        <View
          style={styles.offscreen}
          pointerEvents="none"
          collapsable={false}
          importantForAccessibility="no-hide-descendants"
        >
          <ViewShot ref={shotRef} options={{ format: "png", quality: 1, result: "tmpfile" }}>
            <StatsShareCard
              gamification={gamification}
              stats={stats}
              dailyCounts={dailyCounts}
              onReady={() => readyRef.current?.()}
            />
          </ViewShot>
        </View>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  share: {
    flex: 1,
  },
  offscreen: {
    position: "absolute",
    top: -10000,
    left: -10000,
  },
});
