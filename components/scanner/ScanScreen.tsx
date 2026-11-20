import { Ionicons } from "@expo/vector-icons";
import { useCameraPermissions, type BarcodeScanningResult } from "expo-camera";
import * as Haptics from "expo-haptics";
import { router, useIsFocused } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Alert, Linking, Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import Animated, { FadeIn, FadeInDown, FadeOutDown, LinearTransition } from "react-native-reanimated";

import { colors, radius, spacing, typography } from "../../constants/theme";
import { useCloudSync } from "../../hooks/useCloudSync";
import { useCountryVotes } from "../../hooks/useCountryVotes";
import { useLayout } from "../../hooks/useLayout";
import { useScanHistory } from "../../hooks/useScanHistory";
import { badgeDefinitions } from "../../lib/badges";
import { parseBarcode } from "../../lib/gtin";
import { hapticNotification } from "../../lib/haptics";
import { countryForPrefix } from "../../lib/scan-logic";
import type { ScanRecord } from "../../lib/types";
import { openCountry } from "../../lib/navigation";
import { isVotableCountry, type VoteChoice } from "../../lib/votes";
import { LevelUpModal } from "../gamification/LevelUpModal";
import { useBottomBarSpace } from "../navigation/AdaptiveTabBar";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { Flag } from "../ui/Flag";
import { PressableScale } from "../ui/PressableScale";
import { Screen } from "../ui/Screen";
import { TextField } from "../ui/TextField";
import { VoteButtons } from "../voting/VoteButtons";
import { Viewfinder } from "./Viewfinder";

const KIND_LABEL: Record<string, string> = {
  ean13: "EAN-13",
  ean8: "EAN-8",
  upc_a: "UPC-A",
  upc_e: "UPC-E",
  gtin14: "GTIN-14",
};

export function ScanScreen() {
  const isFocused = useIsFocused();
  const layout = useLayout();
  const barSpace = useBottomBarSpace();
  const { scans, gamification, addScan, applyGamificationState, reload } = useScanHistory();
  useCloudSync(scans, gamification);
  const { getTally, getVerdict, myVote, castVote, reload: reloadVotes } = useCountryVotes(
    scans,
    gamification,
    applyGamificationState
  );
  const [permission, requestPermission] = useCameraPermissions();

  const [manualCode, setManualCode] = useState("");
  const [manualError, setManualError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(true);
  const [latest, setLatest] = useState<{ record: ScanRecord; kind: string } | null>(null);
  const [toast, setToast] = useState<{ xp: number; badgeIds: string[] } | null>(null);
  const [levelUp, setLevelUp] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  // Camera callbacks fire many times per second; state updates are async, so
  // a ref is the only reliable guard against recording one barcode twice.
  const lockRef = useRef(false);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(t);
  }, [toast]);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([reload(), reloadVotes(true)]);
    setRefreshing(false);
  };

  const submit = useCallback(
    async (rawCode: string, source: "camera" | "manual", hint?: string): Promise<boolean> => {
      const parsed = parseBarcode(rawCode, hint);
      if (!parsed.ok) {
        if (source === "manual") setManualError(parsed.message);
        return false;
      }
      if (lockRef.current) return false;
      lockRef.current = true;
      setScanning(false);

      const country = countryForPrefix(parsed.prefix) ?? "Unknown";
      const positive = getVerdict(country);
      try {
        const result = await addScan({ code: parsed.code, country, isPositive: positive, source });
        setLatest({ record: result.record, kind: parsed.kind });
        setToast({ xp: result.gamification.xp, badgeIds: result.newlyUnlockedBadgeIds });
        if (result.leveledUp) setLevelUp(result.gamification.level);
        hapticNotification(
          isVotableCountry(country) && !positive
            ? Haptics.NotificationFeedbackType.Warning
            : Haptics.NotificationFeedbackType.Success
        );
        return true;
      } catch {
        lockRef.current = false;
        setScanning(true);
        Alert.alert("Couldn't save scan", "Something went wrong saving that scan. Please try again.");
        return false;
      }
    },
    [addScan, getVerdict]
  );

  const onCameraScan = useCallback(
    ({ data, type }: BarcodeScanningResult) => {
      if (lockRef.current || !data) return;
      // Misreads fail the check digit: ignore them and keep scanning.
      void submit(data, "camera", type);
    },
    [submit]
  );

  const onManualSubmit = async () => {
    setManualError(null);
    lockRef.current = false;
    if (await submit(manualCode, "manual")) setManualCode("");
  };

  const scanAgain = () => {
    lockRef.current = false;
    setLatest(null);
    setScanning(true);
  };

  const handleVote = async (country: string, choice: VoteChoice) => {
    const outcome = await castVote(country, choice);
    if (!outcome.ok) {
      if (outcome.reason === "signed-out") router.push("/auth");
      else if (outcome.reason === "unverified")
        Alert.alert("Verify your email", "Confirm your email address from the Profile tab to vote.");
      else Alert.alert("Vote not saved", "Check your connection and try again.");
      return;
    }
    if (outcome.isFirstVote) setToast({ xp: outcome.xp, badgeIds: [] });
    if (outcome.leveledUp) setLevelUp(outcome.level);
  };

  const twoPane = layout.useRail && layout.width >= 720;
  const cameraHeight = twoPane
    ? Math.max(260, Math.min(layout.height - 140, 460))
    : Math.max(240, Math.min(layout.width * 0.78, 380));

  const camera = (() => {
    if (Platform.OS === "web") {
      return <Viewfinder active={false} preview scanning={scanning} height={cameraHeight} onScanned={() => {}} />;
    }
    if (!permission) {
      return <View style={[styles.cameraSkeleton, { height: cameraHeight }]} />;
    }
    if (!permission.granted) {
      const blocked = !permission.canAskAgain;
      return (
        <Card style={[styles.permissionCard, { minHeight: cameraHeight }]} tone="hero">
          <View style={styles.permissionIcon}>
            <Ionicons name="camera-outline" size={30} color={colors.brandSoft} />
          </View>
          <Text style={styles.permissionTitle}>Scan with your camera</Text>
          <Text style={styles.permissionText}>
            Solidarity reads barcodes on your device. Nothing from the camera is uploaded.
          </Text>
          <Button
            label={blocked ? "Open Settings" : "Allow camera"}
            icon={blocked ? "settings-outline" : "camera"}
            variant="brand"
            onPress={() => (blocked ? Linking.openSettings() : requestPermission())}
            style={styles.permissionButton}
          />
        </Card>
      );
    }
    // Remounting on focus change resets the torch when leaving the tab.
    return <Viewfinder key={isFocused ? "focused" : "blurred"} active={isFocused} scanning={scanning} height={cameraHeight} onScanned={onCameraScan} />;
  })();

  const manual = (
    <Card>
      <Text style={styles.cardTitle}>Type a barcode</Text>
      <Text style={styles.cardCaption}>EAN-13, EAN-8, UPC-A or UPC-E. The number under the bars.</Text>
      <View style={styles.manualRow}>
        <View style={styles.manualField}>
          <TextField
            value={manualCode}
            onChangeText={(t) => {
              setManualCode(t.replace(/[^\d\s-]/g, ""));
              if (manualError) setManualError(null);
            }}
            placeholder="e.g. 4006381333931"
            keyboardType="number-pad"
            returnKeyType="search"
            onSubmitEditing={onManualSubmit}
            icon="barcode-outline"
            error={manualError}
            maxLength={20}
            accessibilityLabel="Barcode number"
          />
        </View>
        <Button label="Look up" onPress={onManualSubmit} style={styles.manualButton} disabled={!manualCode.trim()} />
      </View>
    </Card>
  );

  const result = latest
    ? (() => {
        const { record, kind } = latest;
        const votable = isVotableCountry(record.country);
        const verdict = votable ? getVerdict(record.country) : null;
        return (
          <Animated.View entering={FadeInDown.springify().damping(18)} layout={LinearTransition}>
            <Card tone={verdict === null ? "default" : verdict ? "positive" : "negative"}>
              <View style={styles.resultTop}>
                <View style={styles.resultFlagRow}>
                  <Flag country={record.country} size={22} />
                  <Text style={styles.overline}>Registered in</Text>
                </View>
                {verdict !== null ? (
                  <View style={[styles.verdict, { backgroundColor: verdict ? "rgba(74,222,155,0.16)" : "rgba(251,113,133,0.16)" }]}>
                    <Ionicons
                      name={verdict ? "checkmark-circle" : "alert-circle"}
                      size={14}
                      color={verdict ? colors.positive : colors.negative}
                    />
                    <Text style={[styles.verdictText, { color: verdict ? colors.positive : colors.negative }]}>
                      Community: {verdict ? "Positive" : "Negative"}
                    </Text>
                  </View>
                ) : null}
              </View>
              <Text style={styles.country} accessibilityRole="header">
                {record.country}
              </Text>
              <View style={styles.metaRow}>
                <Text style={styles.code}>{record.code}</Text>
                <Text style={styles.meta}>
                  {KIND_LABEL[kind] ?? kind} · {record.source === "camera" ? "Camera" : "Typed"}
                </Text>
              </View>

              {votable ? (
                <View style={styles.voteBlock}>
                  <Text style={styles.voteLabel}>What does the community think?</Text>
                  <VoteButtons
                    tally={getTally(record.country)}
                    myChoice={myVote(record.country)}
                    onPress={(choice) => handleVote(record.country, choice)}
                    showBar
                  />
                </View>
              ) : (
                <Text style={styles.metaNote}>
                  {record.country === "Unknown"
                    ? "This prefix isn’t assigned to a country."
                    : "This range isn't a country, so it can't be voted on."}
                </Text>
              )}

              <Text style={styles.disclaimer}>
                {"Shows where the barcode was registered, which isn't always where the product was made."}
              </Text>
              <View style={styles.resultActions}>
                <Button label="Scan another" icon="scan" variant="secondary" onPress={scanAgain} style={styles.flex} />
                <Button
                  label="Details"
                  icon="chevron-forward"
                  onPress={() => openCountry(record.country)}
                  style={styles.flex}
                  accessibilityHint={`Opens ${record.country}`}
                />
              </View>
            </Card>
          </Animated.View>
        );
      })()
    : scans.length > 0
      ? null
      : (
        <Animated.View entering={FadeIn}>
          <Card>
            <Text style={styles.cardTitle}>How it works</Text>
            {[
              { icon: "scan-outline" as const, text: "Scan or type a product barcode." },
              { icon: "flag-outline" as const, text: "See the country its GS1 prefix is registered to." },
              { icon: "people-outline" as const, text: "Check and vote on the community verdict." },
            ].map((step, i) => (
              <View key={step.text} style={styles.step}>
                <View style={styles.stepIcon}>
                  <Ionicons name={step.icon} size={16} color={colors.accent} />
                </View>
                <Text style={styles.stepText}>
                  <Text style={styles.stepNum}>{i + 1}. </Text>
                  {step.text}
                </Text>
              </View>
            ))}
          </Card>
        </Animated.View>
      );

  // Latest scan per country, newest first.
  const recentScans = (() => {
    const seen = new Set<string>();
    return scans.filter((s) => (seen.has(s.country) ? false : (seen.add(s.country), true))).slice(0, 8);
  })();

  const recent =
    recentScans.length > 0 ? (
      <View style={styles.recent}>
        <View style={styles.recentHead}>
          <Text style={styles.cardTitle}>Recent</Text>
          <Text style={styles.recentCaption}>Tap to see details</Text>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.recentRow}
          style={styles.recentScroller}
        >
          {recentScans.map((s) => (
            <PressableScale
              key={s.id}
              onPress={() => openCountry(s.country)}
              accessibilityLabel={`${s.country}, ${s.isPositive ? "positive" : "negative"}`}
              style={styles.recentChip}
            >
              <Flag country={s.country} size={18} />
              <Text style={styles.recentText} numberOfLines={1}>
                {s.country}
              </Text>
              <View style={[styles.recentDot, { backgroundColor: s.isPositive ? colors.positive : colors.negative }]} />
            </PressableScale>
          ))}
        </ScrollView>
      </View>
    ) : null;

  const newBadges = (toast?.badgeIds ?? [])
    .map((id) => badgeDefinitions.find((b) => b.id === id))
    .filter((b): b is NonNullable<typeof b> => !!b);

  return (
    <>
      <Screen
        title="Scan"
        overline="Know what you buy"
        width={twoPane ? "wide" : "readable"}
        refreshing={refreshing}
        onRefresh={onRefresh}
      >
        {twoPane ? (
          <View style={styles.twoPane}>
            <View style={styles.paneLeft}>{camera}</View>
            <View style={styles.paneRight}>
              {result}
              {manual}
              {recent}
            </View>
          </View>
        ) : (
          <>
            {camera}
            {result}
            {manual}
            {recent}
          </>
        )}

        {newBadges.length > 0 && (
          <View style={styles.badgeRow}>
            {newBadges.map((badge) => (
              <Badge key={badge.id} badge={badge} unlocked style={styles.badge} />
            ))}
          </View>
        )}
      </Screen>

      {toast && (
        <Animated.View
          entering={FadeInDown.springify().damping(16)}
          exiting={FadeOutDown.duration(200)}
          style={[styles.toast, { bottom: barSpace + spacing.md }]}
          pointerEvents="none"
          accessibilityLiveRegion="polite"
        >
          <Ionicons name="flash" size={16} color={colors.gold} />
          <Text style={styles.toastText}>
            {toast.xp.toLocaleString()} XP total
            {toast.badgeIds.length > 0 ? " · New badge unlocked!" : ""}
          </Text>
        </Animated.View>
      )}

      <LevelUpModal visible={levelUp !== null} level={levelUp ?? 1} onDismiss={() => setLevelUp(null)} />
    </>
  );
}

const styles = StyleSheet.create({
  twoPane: {
    flexDirection: "row",
    gap: spacing.lg,
    alignItems: "flex-start",
  },
  paneLeft: {
    flex: 1.15,
  },
  paneRight: {
    flex: 1,
    gap: spacing.lg,
  },
  cameraSkeleton: {
    borderRadius: radius.xxl,
    backgroundColor: colors.surface,
  },
  permissionCard: {
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    paddingVertical: spacing.xxl,
  },
  permissionIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "rgba(240, 100, 60, 0.16)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xs,
  },
  permissionTitle: {
    ...typography.title,
    color: colors.text,
    textAlign: "center",
  },
  permissionText: {
    ...typography.body,
    color: colors.subtext,
    textAlign: "center",
    maxWidth: 360,
  },
  permissionButton: {
    marginTop: spacing.md,
    alignSelf: "stretch",
    maxWidth: 320,
    width: "100%",
  },
  cardTitle: {
    ...typography.heading,
    color: colors.text,
  },
  cardCaption: {
    ...typography.caption,
    color: colors.muted,
    marginTop: 2,
    marginBottom: spacing.md,
  },
  manualRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
  },
  manualField: {
    flex: 1,
  },
  manualButton: {
    minWidth: 104,
  },
  resultTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: spacing.sm,
    flexWrap: "wrap",
  },
  overline: {
    ...typography.overline,
    color: colors.subtext,
  },
  verdict: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 5,
  },
  verdictText: {
    ...typography.caption,
    fontWeight: "800",
  },
  country: {
    ...typography.display,
    color: colors.text,
    marginTop: spacing.sm,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  code: {
    ...typography.mono,
    color: colors.text,
    backgroundColor: colors.panelStrong,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    overflow: "hidden",
  },
  meta: {
    ...typography.caption,
    color: colors.subtext,
  },
  metaNote: {
    ...typography.body,
    color: colors.subtext,
    marginTop: spacing.md,
  },
  voteBlock: {
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
  voteLabel: {
    ...typography.caption,
    color: colors.subtext,
  },
  disclaimer: {
    ...typography.caption,
    color: colors.muted,
    fontWeight: "500",
    marginTop: spacing.md,
  },
  resultFlagRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  resultActions: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  flex: {
    flex: 1,
  },
  recent: {
    gap: spacing.sm,
  },
  recentHead: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    paddingHorizontal: spacing.xs,
  },
  recentCaption: {
    ...typography.caption,
    color: colors.muted,
  },
  recentScroller: {
    marginHorizontal: -spacing.xs,
  },
  recentRow: {
    gap: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  recentChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    minHeight: 44,
    paddingLeft: spacing.sm + 2,
    paddingRight: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderStrong,
    maxWidth: 220,
  },
  recentText: {
    ...typography.caption,
    color: colors.text,
    flexShrink: 1,
  },
  recentDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  step: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    marginTop: spacing.md,
  },
  stepIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: "rgba(142, 166, 255, 0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  stepText: {
    ...typography.body,
    color: colors.subtext,
    flex: 1,
  },
  stepNum: {
    color: colors.text,
    fontWeight: "700",
  },
  badgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  badge: {
    width: 120,
  },
  toast: {
    position: "absolute",
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.surfaceHigh,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(251, 191, 36, 0.4)",
    borderRadius: radius.pill,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.lg,
    maxWidth: 420,
  },
  toastText: {
    ...typography.caption,
    color: colors.text,
    fontWeight: "700",
  },
});
