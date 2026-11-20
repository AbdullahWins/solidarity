import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useMemo } from "react";
import { Alert, ScrollView, StyleSheet, Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Card } from "../../components/ui/Card";
import { Donut } from "../../components/ui/Donut";
import { EmptyState } from "../../components/ui/EmptyState";
import { Flag } from "../../components/ui/Flag";
import { IconButton } from "../../components/ui/IconButton";
import { ScreenBackground } from "../../components/ui/Screen";
import { SectionHeader } from "../../components/ui/SectionHeader";
import { RuleSwitch } from "../../components/rules/RuleSwitch";
import { VoteButtons } from "../../components/voting/VoteButtons";
import { colors, layout as sizes, radius, spacing, typography } from "../../constants/theme";
import { useCountryVotes } from "../../hooks/useCountryVotes";
import { useLayout } from "../../hooks/useLayout";
import { useScanHistory } from "../../hooks/useScanHistory";
import { prefixesFor } from "../../lib/navigation";
import { isVotableCountry, type VoteChoice } from "../../lib/votes";

const formatWhen = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });

export default function CountryScreen() {
  const { name } = useLocalSearchParams<{ name: string }>();
  const country = decodeURIComponent(String(name ?? ""));
  const insets = useSafeAreaInsets();
  const { width, gutter } = useLayout();
  const { scans, gamification, applyGamificationState } = useScanHistory();
  const { getTally, getVerdict, myVote, castVote } = useCountryVotes(scans, gamification, applyGamificationState);

  const votable = isVotableCountry(country);
  const tally = getTally(country);
  const up = tally?.upvotes ?? 0;
  const down = tally?.downvotes ?? 0;
  const total = up + down;
  const approval = total > 0 ? Math.round((up / total) * 100) : null;
  const verdict = getVerdict(country);
  const mine = myVote(country);
  const prefixes = useMemo(() => prefixesFor(country), [country]);
  const myScans = useMemo(() => scans.filter((s) => s.country === country), [scans, country]);
  const wide = width >= 760;

  const close = () => (router.canGoBack() ? router.back() : router.replace("/community"));

  const handleVote = async (choice: VoteChoice) => {
    const outcome = await castVote(country, choice);
    if (outcome.ok) return;
    if (outcome.reason === "signed-out") router.push("/auth");
    else if (outcome.reason === "unverified")
      Alert.alert("Verify your email", "Confirm your email address from Profile (the avatar at the top) to vote.");
    else Alert.alert("Vote not saved", "Check your connection and try again.");
  };

  const verdictCard = votable ? (
    <Card tone={total === 0 ? "default" : verdict ? "positive" : "negative"}>
      <SectionHeader title="Community verdict" caption={total > 0 ? `${total.toLocaleString()} votes` : "No votes yet"} />
      <View style={styles.verdictRow}>
        <Donut
          size={128}
          segments={[
            { value: up, color: colors.positive },
            { value: down, color: colors.negative },
          ]}
          label={approval === null ? "–" : `${approval}%`}
          caption="positive"
        />
        <View style={styles.verdictText}>
          <View style={[styles.verdictPill, { backgroundColor: verdict ? "rgba(74,222,155,0.16)" : "rgba(251,113,133,0.16)" }]}>
            <Ionicons
              name={verdict ? "checkmark-circle" : "alert-circle"}
              size={15}
              color={verdict ? colors.positive : colors.negative}
            />
            <Text style={[styles.verdictPillText, { color: verdict ? colors.positive : colors.negative }]}>
              {verdict ? "Positive" : "Negative"}
            </Text>
          </View>
          <Text style={styles.verdictExplain}>
            {total === 0
              ? "Nobody has voted yet, so it shows as positive. Be the first to vote."
              : verdict
                ? "At least as many up votes as down votes."
                : "More down votes than up votes."}
          </Text>
          <View style={styles.legend}>
            <Text style={[styles.legendItem, { color: colors.positive }]}>● {up.toLocaleString()} up</Text>
            <Text style={[styles.legendItem, { color: colors.negative }]}>● {down.toLocaleString()} down</Text>
          </View>
        </View>
      </View>
      <View style={styles.voteWrap}>
        <Text style={styles.voteLabel}>{mine ? "Your vote. Tap it again to remove it." : "Cast your vote"}</Text>
        <VoteButtons tally={tally} myChoice={mine} onPress={handleVote} />
      </View>
    </Card>
  ) : (
    <Card>
      <View style={styles.infoRow}>
        <Ionicons name="information-circle-outline" size={22} color={colors.accent} />
        <Text style={styles.infoText}>
          {"This GS1 range isn't a country (it's used for things like books, coupons or in-store codes), so there's nothing to vote on."}
        </Text>
      </View>
    </Card>
  );

  const ruleCard = votable ? (
    <Card>
      <SectionHeader title="Your rule" caption="Leads your scan results. Stored only on this device." />
      <RuleSwitch country={country} showCaption={false} />
    </Card>
  ) : null;

  const prefixCard = (
    <Card>
      <SectionHeader title="GS1 prefixes" caption="Barcodes starting with these digits are registered here" />
      <View style={styles.prefixes}>
        {prefixes.length > 0 ? (
          prefixes.map((p) => (
            <View key={p} style={styles.prefix}>
              <Text style={styles.prefixText}>{p}</Text>
            </View>
          ))
        ) : (
          <Text style={styles.infoText}>No assigned prefix.</Text>
        )}
      </View>
      <Text style={styles.note}>
        {"Registration country is where the barcode was issued, which isn't always where the product was made."}
      </Text>
    </Card>
  );

  const scansCard = (
    <Card padded={false}>
      <View style={styles.cardHead}>
        <SectionHeader
          title="Your scans"
          caption={myScans.length ? `${myScans.length} from this ${votable ? "country" : "range"}` : undefined}
        />
      </View>
      {myScans.length === 0 ? (
        <View style={styles.emptyWrap}>
          <EmptyState icon="scan-outline" text="You haven't scanned anything from here yet." />
        </View>
      ) : (
        myScans.slice(0, 25).map((s, i, arr) => (
          <View key={s.id} style={[styles.scanRow, i < arr.length - 1 && styles.divider]}>
            <Ionicons name={s.source === "camera" ? "camera-outline" : "keypad-outline"} size={16} color={colors.muted} />
            <Text style={styles.scanCode}>{s.code}</Text>
            <Text style={styles.scanDate}>{formatWhen(s.scannedAt)}</Text>
          </View>
        ))
      )}
    </Card>
  );

  return (
    <View style={styles.root}>
      <ScreenBackground />
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + spacing.sm,
          paddingBottom: insets.bottom + spacing.xxl,
          paddingLeft: insets.left + gutter,
          paddingRight: insets.right + gutter,
          alignItems: "center",
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.column, { maxWidth: wide ? sizes.wide : sizes.readable }]}>
          <View style={styles.topBar}>
            <IconButton icon="chevron-back" onPress={close} accessibilityLabel="Back" />
          </View>

          <Animated.View entering={FadeInDown.duration(380)} style={styles.hero}>
            <View style={styles.flagShadow}>
              <Flag country={country} size={wide ? 72 : 60} />
            </View>
            <View style={styles.heroText}>
              <Text style={styles.overline}>{votable ? "Country" : "GS1 range"}</Text>
              <Text style={styles.title} accessibilityRole="header">
                {country}
              </Text>
              {prefixes.length > 0 ? <Text style={styles.subtitle}>Prefix {prefixes.join(", ")}</Text> : null}
            </View>
          </Animated.View>

          {wide ? (
            <View style={styles.split}>
              <View style={styles.col}>
                {ruleCard}
                {verdictCard}
                {prefixCard}
              </View>
              <View style={styles.col}>{scansCard}</View>
            </View>
          ) : (
            <>
              {ruleCard}
              {verdictCard}
              {prefixCard}
              {scansCard}
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  column: {
    width: "100%",
    gap: spacing.lg,
  },
  topBar: {
    flexDirection: "row",
  },
  hero: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.lg,
    marginBottom: spacing.xs,
  },
  flagShadow: {
    borderRadius: 12,
    shadowColor: "#000",
    shadowOpacity: 0.5,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  heroText: {
    flex: 1,
  },
  overline: {
    ...typography.overline,
    color: colors.brandSoft,
  },
  title: {
    ...typography.display,
    color: colors.text,
  },
  subtitle: {
    ...typography.caption,
    color: colors.subtext,
    marginTop: 2,
  },
  split: {
    flexDirection: "row",
    gap: spacing.lg,
    alignItems: "flex-start",
  },
  col: {
    flex: 1,
    gap: spacing.lg,
  },
  verdictRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.lg,
  },
  verdictText: {
    flex: 1,
    gap: spacing.sm,
  },
  verdictPill: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 5,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 5,
  },
  verdictPillText: {
    ...typography.caption,
    fontWeight: "800",
  },
  verdictExplain: {
    ...typography.body,
    fontSize: 14,
    color: colors.subtext,
  },
  legend: {
    flexDirection: "row",
    gap: spacing.md,
  },
  legendItem: {
    ...typography.caption,
  },
  voteWrap: {
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
  voteLabel: {
    ...typography.caption,
    color: colors.subtext,
  },
  infoRow: {
    flexDirection: "row",
    gap: spacing.md,
    alignItems: "flex-start",
  },
  infoText: {
    ...typography.body,
    color: colors.subtext,
    flex: 1,
  },
  prefixes: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  prefix: {
    borderRadius: radius.sm,
    backgroundColor: colors.panelStrong,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
  },
  prefixText: {
    ...typography.mono,
    color: colors.text,
  },
  note: {
    ...typography.caption,
    color: colors.muted,
    fontWeight: "500",
    marginTop: spacing.md,
  },
  cardHead: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  emptyWrap: {
    padding: spacing.lg,
    paddingTop: 0,
  },
  scanRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  divider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  scanCode: {
    ...typography.mono,
    color: colors.text,
    flex: 1,
  },
  scanDate: {
    ...typography.caption,
    color: colors.muted,
  },
});
