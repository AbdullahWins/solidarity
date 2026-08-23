import { Ionicons } from "@expo/vector-icons";
import * as MediaLibrary from "expo-media-library";
import * as Sharing from "expo-sharing";
import React, { useRef, useState } from "react";
import { Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import ViewShot from "react-native-view-shot";

import { colors, radius, spacing, typography } from "../../constants/theme";
import { buildDailyCounts } from "../../lib/gamification";
import type { GamificationState, ScanRecord } from "../../lib/types";
import { StatsShareCard } from "./StatsShareCard";

type Props = {
  scans: ScanRecord[];
  gamification: GamificationState;
  stats: { total: number; positive: number; negative: number };
};

export function ShareStatsButton({ scans, gamification, stats }: Props) {
  const shotRef = useRef<ViewShot>(null);
  const [sharing, setSharing] = useState(false);
  const [saving, setSaving] = useState(false);
  const dailyCounts = buildDailyCounts(scans);

  const handleShare = async () => {
    if (sharing) return;
    setSharing(true);
    try {
      const uri = await shotRef.current?.capture?.();
      if (uri) {
        const available = await Sharing.isAvailableAsync();
        if (available) {
          await Sharing.shareAsync(uri, { mimeType: "image/png" });
        }
      }
    } finally {
      setSharing(false);
    }
  };

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const permission = await MediaLibrary.requestPermissionsAsync();
      if (!permission.granted) {
        Alert.alert("Permission needed", "Allow photo access to save your stats image.");
        return;
      }
      const uri = await shotRef.current?.capture?.();
      if (uri) {
        await MediaLibrary.saveToLibraryAsync(uri);
        Alert.alert("Saved", "Your stats image was saved to your photos.");
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <View style={styles.row}>
        <TouchableOpacity
          style={[styles.button, styles.shareButton]}
          onPress={handleShare}
          disabled={sharing}
        >
          <Ionicons name="share-social" size={16} color="#ffffff" />
          <Text style={styles.buttonText}>{sharing ? "Preparing..." : "Share stats"}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, styles.saveButton]}
          onPress={handleSave}
          disabled={saving}
        >
          <Ionicons name="download" size={16} color={colors.text} />
        </TouchableOpacity>
      </View>

      <View style={styles.offscreen} pointerEvents="none">
        <ViewShot ref={shotRef} options={{ format: "png", quality: 1 }}>
          <StatsShareCard gamification={gamification} stats={stats} dailyCounts={dailyCounts} />
        </ViewShot>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    borderRadius: radius.md,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
  },
  shareButton: {
    flex: 1,
    backgroundColor: colors.accentStrong,
  },
  saveButton: {
    width: 46,
    backgroundColor: colors.panelSoft,
    borderWidth: 1,
    borderColor: colors.border,
  },
  buttonText: {
    ...typography.body,
    color: "#ffffff",
    fontWeight: "700",
  },
  offscreen: {
    position: "absolute",
    top: -9999,
    left: -9999,
  },
});
