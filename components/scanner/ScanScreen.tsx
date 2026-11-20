import { Ionicons } from "@expo/vector-icons";
import { useCameraPermissions, type BarcodeScanningResult } from "expo-camera";
import * as DocumentPicker from "expo-document-picker";
import { router, useIsFocused } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { AccessibilityInfo, Alert, Linking, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { FadeIn, FadeInDown, FadeInUp, FadeOutUp, LinearTransition } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors, radius, spacing, typography } from "../../constants/theme";
import { useCloudSync } from "../../hooks/useCloudSync";
import { useBasket } from "../../hooks/useBasket";
import { useCountryRules } from "../../hooks/useCountryRules";
import { useCountryVotes } from "../../hooks/useCountryVotes";
import { usePreferences } from "../../hooks/usePreferences";
import { useProductLookup } from "../../hooks/useProductLookup";
import { useLayout } from "../../hooks/useLayout";
import { useScanHistory } from "../../hooks/useScanHistory";
import { badgeDefinitions } from "../../lib/badges";
import { getBasket, recordBasketScan, removeFromBasket, setBasketActive, updateBasketItem } from "../../lib/basket";
import { resolveAnswer, type Answer } from "../../lib/countryRules";
import { parseBarcode } from "../../lib/gtin";
import { isDemo } from "../../lib/demo";
import { hapticBasketAdd, hapticSelection, hapticVerdict } from "../../lib/haptics";
import { getCachedPreferences } from "../../lib/preferences";
import { planPhoto, scanImage, type FoundCode } from "../../lib/photoScan";
import { lookupProduct, productPatch } from "../../lib/productLookup";
import { countryForPrefix } from "../../lib/scan-logic";
import type { ScanRecord, ScanSource } from "../../lib/types";
import { openCountry } from "../../lib/navigation";
import { isVotableCountry, type VoteChoice } from "../../lib/votes";
import { AccountButton } from "../navigation/AccountButton";
import { RuleSwitch } from "../rules/RuleSwitch";
import { LevelUpModal } from "../gamification/LevelUpModal";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { Flag } from "../ui/Flag";
import { Screen } from "../ui/Screen";
import { TextField } from "../ui/TextField";
import { VoteButtons } from "../voting/VoteButtons";
import { BarcodeInfoSheet } from "./BarcodeInfoSheet";
import { BasketBar, type BasketNotice } from "./BasketBar";
import { ProductRow } from "./ProductRow";
import { Viewfinder } from "./Viewfinder";

const KIND_LABEL: Record<string, string> = {
  ean13: "EAN-13",
  ean8: "EAN-8",
  upc_a: "UPC-A",
  upc_e: "UPC-E",
  gtin14: "GTIN-14",
};

const BASKET_COOLDOWN_MS = 1200;

/** Screen-reader text for a result: country, then the primary verdict. */
function spokenVerdict(country: string, answer: Answer, communityPositive: boolean): string {
  if (answer.source === "rule") return `${country}. You ${answer.rule} this country.`;
  if (answer.source === "none") return `${country}. No verdict for this range.`;
  return `${country}. ${communityPositive ? "Looks fine." : "Community says avoid."}`;
}

function announce(text: string) {
  AccessibilityInfo.announceForAccessibility(text);
}
const BASKET_UNDO_MS = 5000;

type PillProps = {
  label: string;
  icon: React.ComponentProps<typeof Ionicons>["name"];
  active?: boolean;
  onPress: () => void;
  a11yLabel: string;
  a11yHint?: string;
  role?: "button" | "switch";
  disabled?: boolean;
};

function Pill(opts: PillProps) {
  return (
    <Pressable
      onPress={opts.onPress}
      disabled={opts.disabled}
      style={({ pressed }) => [styles.pill, opts.active && styles.pillOn, pressed && { opacity: 0.8 }]}
      accessibilityRole={opts.role ?? "button"}
      accessibilityState={opts.role === "switch" ? { checked: !!opts.active } : { expanded: opts.active }}
      accessibilityLabel={opts.a11yLabel}
      accessibilityHint={opts.a11yHint}
    >
      <Ionicons name={opts.icon} size={16} color={opts.active ? colors.bg : colors.text} />
      <Text style={[styles.pillText, opts.active && { color: colors.bg }]} numberOfLines={1}>
        {opts.label}
      </Text>
    </Pressable>
  );
}

export function ScanScreen() {
  const isFocused = useIsFocused();
  const layout = useLayout();
  const insets = useSafeAreaInsets();
  const { scans, gamification, addScan, updateScan, applyGamificationState, reload } = useScanHistory();
  useCloudSync(scans, gamification);
  const { getTally, getVerdict, myVote, castVote, reload: reloadVotes } = useCountryVotes(
    scans,
    gamification,
    applyGamificationState
  );
  const rules = useCountryRules();
  const { preferences, update: updatePreferences } = usePreferences();
  const [permission, requestPermission] = useCameraPermissions();

  const [manualCode, setManualCode] = useState("");
  const [manualError, setManualError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(true);
  const [latest, setLatest] = useState<{ record: ScanRecord; kind: string } | null>(null);
  const [toast, setToast] = useState<{ xp: number; badgeIds: string[] } | null>(null);
  const [levelUp, setLevelUp] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  // Camera callbacks fire many times per second; state updates are async, so
  // a ref is the only reliable guard against recording one barcode twice.
  const lockRef = useRef(false);
  const { basket } = useBasket();
  const basketOn = basket.active;
  const [basketNotice, setBasketNotice] = useState<BasketNotice | null>(null);
  // While a product stays in view, repeat "already in basket" notices are suppressed.
  const lastDuplicateRef = useRef<{ code: string; at: number } | null>(null);

  useEffect(() => {
    if (!basketNotice) return;
    const t = setTimeout(() => setBasketNotice(null), BASKET_UNDO_MS);
    return () => clearTimeout(t);
  }, [basketNotice]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(t);
  }, [toast]);

  const latestRecord = latest?.record ?? null;
  const product = useProductLookup(latestRecord?.code ?? null, preferences.productLookup === "on", (found) => {
    if (latestRecord) void updateScan(latestRecord.id, productPatch(found.product));
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([reload(), reloadVotes(true)]);
    setRefreshing(false);
  };

  const submit = useCallback(
    async (rawCode: string, source: ScanSource, hint?: string): Promise<boolean> => {
      const parsed = parseBarcode(rawCode, hint);
      if (!parsed.ok) {
        if (source === "manual") setManualError(parsed.message);
        return false;
      }
      if (lockRef.current) return false;
      lockRef.current = true;

      const country = countryForPrefix(parsed.prefix) ?? "Unknown";
      const positive = getVerdict(country);
      const answer = resolveAnswer(country, positive);

      if (getBasket().active) {
        // Basket mode: keep the camera running, record each barcode once.
        try {
          const outcome = await recordBasketScan({ code: parsed.code, country, tone: answer.tone }, () =>
            addScan({ code: parsed.code, country, isPositive: positive, source, rule: answer.rule })
          );
          if (outcome.status === "duplicate") {
            const last = lastDuplicateRef.current;
            if (!last || last.code !== parsed.code || Date.now() - last.at > 4000) {
              setBasketNotice({ kind: "duplicate", country });
              hapticSelection();
              announce("Already in basket");
            }
            lastDuplicateRef.current = { code: parsed.code, at: Date.now() };
          } else {
            const { result } = outcome;
            setBasketNotice({ kind: "added", item: { code: parsed.code, country, tone: answer.tone } });
            setToast({ xp: result.gamification.xp, badgeIds: result.newlyUnlockedBadgeIds });
            if (result.leveledUp) setLevelUp(result.gamification.level);
            hapticBasketAdd(answer.tone);
            announce(`Added. ${spokenVerdict(country, answer, positive)}`);
            if (getCachedPreferences().productLookup === "on" && isVotableCountry(country) && !isDemo()) {
              void lookupProduct(parsed.code).then((found) => {
                if (found.status !== "found") return;
                void updateBasketItem(parsed.code, { productName: found.product.name ?? found.product.brand, owner: found.product.owner });
                void updateScan(result.record.id, productPatch(found.product));
              });
            }
          }
          if (source === "manual") setManualCode("");
          return true;
        } catch {
          Alert.alert("Couldn't save scan", "Something went wrong saving that scan. Please try again.");
          return false;
        } finally {
          setTimeout(() => {
            lockRef.current = false;
          }, BASKET_COOLDOWN_MS);
        }
      }

      setScanning(false);
      try {
        const result = await addScan({ code: parsed.code, country, isPositive: positive, source, rule: answer.rule });
        setLatest({ record: result.record, kind: parsed.kind });
        setDetailsOpen(false);
        setManualOpen(false);
        setToast({ xp: result.gamification.xp, badgeIds: result.newlyUnlockedBadgeIds });
        if (result.leveledUp) setLevelUp(result.gamification.level);
        hapticVerdict(answer.tone);
        announce(spokenVerdict(country, answer, positive));
        return true;
      } catch {
        lockRef.current = false;
        setScanning(true);
        Alert.alert("Couldn't save scan", "Something went wrong saving that scan. Please try again.");
        return false;
      }
    },
    [addScan, getVerdict, updateScan]
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

  const [photoChoices, setPhotoChoices] = useState<FoundCode[] | null>(null);
  const [readingPhoto, setReadingPhoto] = useState(false);

  const submitPhotoCode = async (found: FoundCode) => {
    lockRef.current = false;
    return submit(found.raw, "photo", found.type);
  };

  const onPhoto = async () => {
    setPhotoChoices(null);
    let uri: string | undefined;
    try {
      const picked = await DocumentPicker.getDocumentAsync({ type: "image/*", copyToCacheDirectory: true, multiple: false });
      if (picked.canceled) return;
      uri = picked.assets?.[0]?.uri;
    } catch {
      uri = undefined;
    }
    if (!uri) return;
    setReadingPhoto(true);
    const codes = await scanImage(uri);
    setReadingPhoto(false);
    const plan = planPhoto(codes, getBasket().active);
    if (plan.kind === "none") {
      Alert.alert(
        "No barcode found",
        "Try a sharper photo, or zoom in on the barcode before taking the screenshot.",
        [
          { text: "Type it instead", onPress: () => setManualOpen(true) },
          { text: "OK", style: "cancel" },
        ]
      );
    } else if (plan.kind === "one") {
      await submitPhotoCode(plan.code);
    } else if (plan.kind === "choose") {
      setPhotoChoices(plan.codes);
    } else {
      for (const code of plan.codes) await submitPhotoCode(code);
    }
  };

  const toggleBasket = () => {
    hapticSelection();
    lockRef.current = false;
    setLatest(null);
    setScanning(true);
    setBasketNotice(null);
    void setBasketActive(!basketOn);
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
        Alert.alert("Verify your email", "Confirm your email address from Profile (the avatar at the top) to vote.");
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

  const manual = manualOpen ? (
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
            autoFocus
            accessibilityLabel="Barcode number"
          />
        </View>
        <Button label="Look up" onPress={onManualSubmit} style={styles.manualButton} disabled={!manualCode.trim()} />
      </View>
    </Card>
  ) : null;

  // Under the camera: switch basket mode, or type a code.
  // Under the camera: basket mode, read from a photo, or type a code.
  const controls = (
    <View style={styles.controls}>
      <Pill
        label={basketOn ? "Basket on" : "Basket"}
        icon={basketOn ? "basket" : "basket-outline"}
        active={basketOn}
        onPress={toggleBasket}
        role="switch"
        a11yLabel="Basket mode"
        a11yHint="Keeps scanning and builds a list of everything you scan"
      />
      <Pill
        label={readingPhoto ? "Reading…" : "Photo"}
        icon="image-outline"
        onPress={onPhoto}
        disabled={readingPhoto}
        a11yLabel="Scan from photo"
        a11yHint="Reads a barcode from a screenshot or photo"
      />
      <Pill
        label="Type code"
        icon="keypad-outline"
        active={manualOpen}
        onPress={() => setManualOpen((v) => !v)}
        a11yLabel="Type a barcode"
      />
    </View>
  );

  const photoPicker = photoChoices ? (
    <Card>
      <Text style={styles.cardTitle}>Which barcode?</Text>
      <Text style={styles.cardCaption}>This photo has {photoChoices.length} barcodes.</Text>
      <View style={styles.choiceList}>
        {photoChoices.map((c) => {
          const parsed = parseBarcode(c.raw, c.type);
          const country = (parsed.ok && countryForPrefix(parsed.prefix)) || "Unknown";
          return (
            <Pressable
              key={c.code}
              onPress={() => {
                setPhotoChoices(null);
                void submitPhotoCode(c);
              }}
              style={({ pressed }) => [styles.choice, pressed && { opacity: 0.7 }]}
              accessibilityRole="button"
              accessibilityLabel={`Check ${country}, ${c.code}`}
            >
              <Flag country={country} size={20} />
              <Text style={styles.choiceCountry} numberOfLines={1}>
                {country}
              </Text>
              <Text style={styles.code}>{c.code}</Text>
            </Pressable>
          );
        })}
      </View>
      <Button label="Cancel" variant="secondary" onPress={() => setPhotoChoices(null)} />
    </Card>
  ) : null;

  const basketBar = basketOn ? (
    <BasketBar
      notice={basketNotice}
      onUndo={(code) => {
        void removeFromBasket(code);
        setBasketNotice(null);
      }}
    />
  ) : null;

  const result = latest
    ? (() => {
        const { record, kind } = latest;
        const votable = isVotableCountry(record.country);
        const community = votable ? getVerdict(record.country) : null;
        const answer = resolveAnswer(record.country, community ?? true, rules);
        const verdict = answer.tone === "neutral" ? null : answer.tone === "positive";
        const tally = votable ? getTally(record.country) : undefined;
        const votes = (tally?.upvotes ?? 0) + (tally?.downvotes ?? 0);
        const tone = verdict === null ? colors.subtext : verdict ? colors.positive : colors.negative;
        const communityLine =
          votes > 0
            ? `${community ? "Positive" : "Negative"} from ${votes.toLocaleString()} vote${votes === 1 ? "" : "s"}`
            : "no votes yet";
        const headline =
          answer.source === "rule"
            ? answer.rule === "avoid"
              ? `You avoid ${record.country}`
              : `You support ${record.country}`
            : verdict === null
              ? record.country === "Unknown"
                ? "Unknown origin"
                : "Not a country range"
              : verdict
                ? "Looks fine"
                : "Community says avoid";
        const caption =
          answer.source === "rule"
            ? `Community: ${communityLine}`
            : verdict === null
              ? record.country === "Unknown"
                ? "This prefix isn’t assigned to a country."
                : "This range isn’t a country, so it has no verdict."
              : votes > 0
                ? `Community verdict from ${votes.toLocaleString()} vote${votes === 1 ? "" : "s"}`
                : "No community votes yet";
        return (
          <Animated.View entering={FadeInDown.springify().damping(18)} layout={LinearTransition}>
            <Card tone={verdict === null ? "default" : verdict ? "positive" : "negative"}>
              <View style={styles.resultFlagRow}>
                <Flag country={record.country} size={26} />
                <Text style={styles.resultCountry} numberOfLines={2}>
                  {record.country}
                </Text>
                <Pressable
                  onPress={() => setInfoOpen(true)}
                  style={styles.infoButton}
                  accessibilityRole="button"
                  accessibilityLabel="What this barcode tells you"
                  hitSlop={6}
                >
                  <Ionicons name="information-circle-outline" size={22} color={colors.subtext} />
                </Pressable>
              </View>
              {isVotableCountry(record.country) ? (
                <ProductRow
                  code={record.code}
                  consent={preferences.productLookup}
                  state={product}
                  onConsent={(on) => void updatePreferences({ productLookup: on ? "on" : "off" })}
                />
              ) : null}
              <View style={styles.verdictRow} accessibilityRole="header">
                <Ionicons
                  name={verdict === null ? "help-circle" : verdict ? "checkmark-circle" : "alert-circle"}
                  size={30}
                  color={tone}
                />
                <Text style={[styles.verdictHeadline, { color: tone }]}>{headline}</Text>
              </View>
              <Text style={styles.verdictCaption}>{caption}</Text>

              <Button label="Scan next" icon="scan" variant="brand" onPress={scanAgain} style={styles.scanNext} />

              <Pressable
                onPress={() => setDetailsOpen((v) => !v)}
                style={({ pressed }) => [styles.detailsToggle, pressed && { opacity: 0.7 }]}
                accessibilityRole="button"
                accessibilityState={{ expanded: detailsOpen }}
              >
                <Text style={styles.detailsToggleText}>{votable ? "Details & vote" : "Details"}</Text>
                <Ionicons name={detailsOpen ? "chevron-up" : "chevron-down"} size={16} color={colors.subtext} />
              </Pressable>

              {detailsOpen ? (
                <Animated.View entering={FadeIn.duration(180)} style={styles.details}>
                  {votable ? <RuleSwitch country={record.country} /> : null}
                  {votable ? (
                    <View style={styles.voteBlock}>
                      <Text style={styles.voteLabel}>What does the community think?</Text>
                      <VoteButtons
                        tally={tally}
                        myChoice={myVote(record.country)}
                        onPress={(choice) => handleVote(record.country, choice)}
                        showBar
                      />
                    </View>
                  ) : null}
                  <View style={styles.metaRow}>
                    <Text style={styles.code}>{record.code}</Text>
                    <Text style={styles.meta}>
                      {KIND_LABEL[kind] ?? kind} · {record.source === "camera" ? "Camera" : record.source === "photo" ? "Photo" : "Typed"}
                    </Text>
                  </View>
                  <Text style={styles.disclaimer}>
                    {"The prefix shows where the barcode was registered, which isn't always where the product was made."}
                  </Text>
                  <Button
                    label="View country"
                    icon="chevron-forward"
                    variant="secondary"
                    onPress={() => openCountry(record.country)}
                    accessibilityHint={`Opens ${record.country}`}
                  />
                </Animated.View>
              ) : null}
            </Card>
          </Animated.View>
        );
      })()
    : null;

  const newBadges = (toast?.badgeIds ?? [])
    .map((id) => badgeDefinitions.find((b) => b.id === id))
    .filter((b): b is NonNullable<typeof b> => !!b);

  return (
    <>
      <Screen
        title="Scan"
        headerRight={<AccountButton />}
        overline="Know what you buy"
        width={twoPane ? "wide" : "readable"}
        refreshing={refreshing}
        onRefresh={onRefresh}
      >
        {twoPane ? (
          <View style={styles.twoPane}>
            <View style={styles.paneLeft}>{camera}</View>
            <View style={styles.paneRight}>
              {controls}
              {photoPicker}
              {basketOn ? basketBar : result}
              {manual}
            </View>
          </View>
        ) : (
          <>
            {camera}
            {controls}
            {photoPicker}
            {basketOn ? basketBar : result}
            {manual}
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
          entering={FadeInUp.springify().damping(16)}
          exiting={FadeOutUp.duration(200)}
          style={[styles.toast, { top: insets.top + spacing.sm }]}
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

      <BarcodeInfoSheet visible={infoOpen} onClose={() => setInfoOpen(false)} />
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





  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: spacing.sm,
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

  voteBlock: {
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
  },
  resultFlagRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },

  infoButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    marginRight: -spacing.sm,
  },
  resultCountry: {
    ...typography.title,
    color: colors.text,
    flex: 1,
  },
  verdictRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  verdictHeadline: {
    ...typography.display,
    flexShrink: 1,
  },
  verdictCaption: {
    ...typography.body,
    color: colors.subtext,
    marginTop: spacing.xs,
  },
  scanNext: {
    marginTop: spacing.lg,
  },
  detailsToggle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    minHeight: 44,
    marginTop: spacing.sm,
  },
  detailsToggleText: {
    ...typography.bodyStrong,
    color: colors.subtext,
  },
  details: {
    gap: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  choiceList: {
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  choice: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    minHeight: 48,
    paddingHorizontal: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.panel,
  },
  choiceCountry: {
    ...typography.bodyStrong,
    color: colors.text,
    flex: 1,
  },
  controls: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  pill: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    minHeight: 44,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderStrong,
  },
  pillOn: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  pillText: {
    ...typography.bodyStrong,
    color: colors.text,
    flexShrink: 1,
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
