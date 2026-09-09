import { Ionicons } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useState } from "react";
import {
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useIsFocused } from "@react-navigation/native";

import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { ScreenContainer } from "../components/ui/ScreenContainer";
import { LevelUpModal } from "../components/gamification/LevelUpModal";
import { VoteButtons } from "../components/voting/VoteButtons";
import { colors, radius, spacing, typography } from "../constants/theme";
import { badgeDefinitions } from "../lib/badges";
import { hapticNotification } from "../lib/haptics";
import { useCloudSync } from "../hooks/useCloudSync";
import { useCountryVotes } from "../hooks/useCountryVotes";
import { useScanHistory } from "../hooks/useScanHistory";
import { identifyCountry } from "../lib/scan-logic";
import type { ScanRecord } from "../lib/types";
import { isVotableCountry, type VoteChoice } from "../lib/votes";

type BarcodeScanningResult = {
  data: string;
};

export default function CustomBarcodeScanner() {
  const isFocused = useIsFocused();
  const { scans, gamification, addScan, applyGamificationState, reload } = useScanHistory();
  useCloudSync(scans, gamification);
  const { getTally, getVerdict, myVote, castVote, reload: reloadVotes } = useCountryVotes(
    scans,
    gamification,
    applyGamificationState
  );

  const [manualCode, setManualCode] = useState("");
  const [cameraKey, setCameraKey] = useState(0);
  const [readyToScan, setReadyToScan] = useState(true);
  const [latestRecord, setLatestRecord] = useState<ScanRecord | null>(null);
  const [xpToast, setXpToast] = useState<{ xp: number; badgeIds: string[] } | null>(null);
  const [levelUpModal, setLevelUpModal] = useState<{ level: number } | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([reload(), reloadVotes(true)]);
    setRefreshing(false);
  };

  const [permission, requestPermission] = useCameraPermissions();

  useEffect(() => {
    if (isFocused) {
      setReadyToScan(true);
      setCameraKey((v) => v + 1);
    }
  }, [isFocused]);

  useEffect(() => {
    if (!xpToast) return;
    const timeout = setTimeout(() => setXpToast(null), 3200);
    return () => clearTimeout(timeout);
  }, [xpToast]);

  const submitScan = async (barcode: string, source: "camera" | "manual") => {
    const country = identifyCountry(barcode) || "Unknown";
    const positive = getVerdict(country);

    const result = await addScan({ code: barcode, country, isPositive: positive, source });

    setLatestRecord(result.record);
    setXpToast({
      xp: result.gamification.xp,
      badgeIds: result.newlyUnlockedBadgeIds,
    });

    if (result.leveledUp) {
      setLevelUpModal({ level: result.gamification.level });
    }

    hapticNotification(
      positive ? Haptics.NotificationFeedbackType.Warning : Haptics.NotificationFeedbackType.Success
    );

    setReadyToScan(false);
  };

  const handleBarCodeScanned = ({ data }: BarcodeScanningResult) => {
    if (!readyToScan) return;
    if (!data) {
      Alert.alert("Invalid Scan", "No barcode value was detected.");
      return;
    }
    submitScan(data, "camera");
  };

  const handleManualSearch = () => {
    const cleaned = manualCode.trim();
    if (!cleaned) {
      Alert.alert("Missing Barcode", "Enter a barcode to continue.");
      return;
    }
    submitScan(cleaned, "manual");
    setManualCode("");
  };

  const prepareNextScan = () => {
    setReadyToScan(true);
    setCameraKey((v) => v + 1);
    setLatestRecord(null);
  };

  const handleVote = async (country: string, choice: VoteChoice) => {
    const outcome = await castVote(country, choice);
    if (!outcome.ok) {
      if (outcome.reason === "signed-out") {
        router.push("/auth");
      } else if (outcome.reason === "unverified") {
        Alert.alert(
          "Verify your email",
          "Verify your email address in Profile to vote on countries."
        );
      }
      return;
    }
    if (outcome.isFirstVote) {
      setXpToast({ xp: outcome.xp, badgeIds: [] });
    }
    if (outcome.leveledUp) {
      setLevelUpModal({ level: outcome.level });
    }
  };

  if (!permission) {
    return (
      <ScreenContainer>
        <View style={styles.centeredState}>
          <Text style={styles.stateTitle}>Preparing camera</Text>
          <Text style={styles.stateText}>Checking permission status...</Text>
        </View>
      </ScreenContainer>
    );
  }

  if (!permission.granted) {
    return (
      <ScreenContainer>
        <View style={styles.centeredState}>
          <Text style={styles.stateTitle}>Camera permission required</Text>
          <Text style={styles.stateText}>
            Allow camera access to scan product barcodes.
          </Text>
          <Button label="Grant Permission" onPress={requestPermission} style={{ marginTop: spacing.lg }} />
        </View>
      </ScreenContainer>
    );
  }

  const newBadges = xpToast?.badgeIds
    .map((id) => badgeDefinitions.find((b) => b.id === id))
    .filter((b): b is NonNullable<typeof b> => !!b);

  return (
    <ScreenContainer>
      <StatusBar hidden />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.text} />
        }
      >
        <Card style={styles.cameraCard}>
          <View style={styles.cameraFrame}>
            {isFocused ? (
              <CameraView
                key={`camera-${cameraKey}`}
                style={styles.camera}
                onBarcodeScanned={readyToScan ? handleBarCodeScanned : undefined}
                barcodeScannerSettings={{
                  barcodeTypes: ["qr", "upc_e", "ean13", "ean8"],
                }}
              />
            ) : (
              <View style={styles.camera} />
            )}
            <View pointerEvents="none" style={styles.scanGuideWrap}>
              <View style={styles.scanGuideLine} />
              <View style={[styles.scanEdgeMark, styles.scanEdgeMarkLeft]} />
              <View style={[styles.scanEdgeMark, styles.scanEdgeMarkRight]} />
            </View>
          </View>

          <Text style={styles.scanHintText}>
            {readyToScan ? "Point camera at a barcode" : "Captured — check the result below."}
          </Text>

          {!readyToScan && (
            <Button
              label="Scan Another"
              variant="secondary"
              onPress={prepareNextScan}
              style={{ marginTop: spacing.md }}
            />
          )}
        </Card>

        <Card style={styles.manualCard}>
          <Text style={styles.manualTitle}>Manual barcode lookup</Text>
          <View style={styles.manualRow}>
            <TextInput
              style={styles.manualInput}
              value={manualCode}
              onChangeText={setManualCode}
              placeholder="Enter barcode number"
              placeholderTextColor={colors.subtext}
              keyboardType="number-pad"
            />
            <TouchableOpacity style={styles.manualButton} onPress={handleManualSearch}>
              <Text style={styles.manualButtonText}>Analyze</Text>
            </TouchableOpacity>
          </View>
        </Card>

        {latestRecord && (() => {
          const votable = isVotableCountry(latestRecord.country);
          // Live verdict, not the frozen scan-time snapshot — this card sits
          // right above the vote buttons, so it must track any vote the user
          // just cast instead of showing a stale "Positive"/"Negative" label
          // that visually contradicts their own just-cast vote.
          const liveVerdict = votable ? getVerdict(latestRecord.country) : null;

          return (
            <Card tone={votable ? (liveVerdict ? "positive" : "negative") : "default"}>
              <Text style={styles.latestTitle}>Latest result</Text>
              <Text style={styles.latestCountry}>{latestRecord.country}</Text>
              <Text style={styles.latestMeta}>Barcode: {latestRecord.code}</Text>
              <Text style={styles.latestMeta}>Source: {latestRecord.source}</Text>

              {votable ? (
                <>
                  <Text
                    style={[
                      styles.latestTone,
                      liveVerdict ? styles.positiveTone : styles.negativeTone,
                    ]}
                  >
                    {liveVerdict ? "Community: Positive" : "Community: Negative"}
                  </Text>
                  <View style={{ marginTop: spacing.sm }}>
                    <VoteButtons
                      tally={getTally(latestRecord.country)}
                      myChoice={myVote(latestRecord.country)}
                      onPress={(choice) => handleVote(latestRecord.country, choice)}
                    />
                  </View>
                </>
              ) : (
                <Text style={styles.latestMeta}>Not a votable country/region.</Text>
              )}
            </Card>
          );
        })()}

        {newBadges && newBadges.length > 0 && (
          <View style={styles.badgeRow}>
            {newBadges.map((badge) => (
              <Badge key={badge.id} badge={badge} unlocked />
            ))}
          </View>
        )}
      </ScrollView>

      {xpToast && (
        <View style={styles.toast}>
          <Ionicons name="flash" size={16} color={colors.gold} />
          <Text style={styles.toastText}>
            Total XP: {xpToast.xp}
            {xpToast.badgeIds.length > 0 ? " · New badge unlocked!" : ""}
          </Text>
        </View>
      )}

      <LevelUpModal
        visible={!!levelUpModal}
        level={levelUpModal?.level ?? 1}
        onDismiss={() => setLevelUpModal(null)}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },
  cameraCard: {
    padding: spacing.md,
  },
  cameraFrame: {
    borderRadius: radius.lg,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.border,
    height: 132,
    backgroundColor: "#000",
  },
  camera: {
    width: "100%",
    height: "100%",
  },
  scanGuideWrap: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
  },
  scanGuideLine: {
    width: "78%",
    height: 2,
    backgroundColor: `${colors.accent}cc`,
    borderRadius: radius.pill,
  },
  scanEdgeMark: {
    position: "absolute",
    width: 3,
    height: "54%",
    backgroundColor: `${colors.accent}cc`,
    borderRadius: radius.pill,
  },
  scanEdgeMarkLeft: { left: "11%" },
  scanEdgeMarkRight: { right: "11%" },
  scanHintText: {
    color: colors.subtext,
    marginTop: spacing.md,
    fontSize: 13,
    textAlign: "center",
  },
  manualCard: {
    padding: spacing.md,
  },
  manualTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "700",
    marginBottom: spacing.sm,
  },
  manualRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  manualInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    color: colors.text,
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    fontSize: 14,
  },
  manualButton: {
    backgroundColor: colors.accentStrong,
    borderRadius: radius.md,
    paddingVertical: spacing.sm + 3,
    paddingHorizontal: spacing.md + 2,
    alignItems: "center",
    justifyContent: "center",
  },
  manualButtonText: {
    color: "#ffffff",
    fontWeight: "700",
    fontSize: 13,
  },
  latestTitle: {
    color: colors.subtext,
    fontSize: 13,
    marginBottom: spacing.xs + 2,
  },
  latestCountry: {
    color: colors.text,
    fontSize: 23,
    fontWeight: "800",
    marginBottom: spacing.sm,
  },
  latestMeta: {
    color: colors.subtext,
    fontSize: 13,
    marginTop: 3,
  },
  latestTone: {
    marginTop: spacing.sm,
    fontWeight: "800",
    fontSize: 14,
  },
  positiveTone: { color: colors.positive },
  negativeTone: { color: colors.negative },
  badgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  centeredState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: spacing.xxl,
  },
  stateTitle: {
    ...typography.title,
    color: colors.text,
    textAlign: "center",
  },
  stateText: {
    color: colors.subtext,
    marginTop: spacing.sm,
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
  toast: {
    position: "absolute",
    bottom: spacing.xl,
    left: spacing.xl,
    right: spacing.xl,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.bgElevated,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.md,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
  },
  toastText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: "700",
    flexShrink: 1,
  },
});
