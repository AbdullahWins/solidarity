import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { colors, layout, radius, spacing, typography } from "../../constants/theme";
import { hapticImpact } from "../../lib/haptics";
import type { CountryTally, VoteChoice } from "../../lib/votes";
import { PressableScale } from "../ui/PressableScale";

type Props = {
  tally: CountryTally | undefined;
  myChoice: VoteChoice | undefined;
  onPress: (choice: VoteChoice) => void;
  disabled?: boolean;
  compact?: boolean;
  /** Shows the up/down share bar above the buttons. */
  showBar?: boolean;
};

function VoteButton({
  choice,
  count,
  active,
  onPress,
  disabled,
  compact,
}: {
  choice: VoteChoice;
  count: number;
  active: boolean;
  onPress: () => void;
  disabled?: boolean;
  compact?: boolean;
}) {
  const tone = choice === "up" ? colors.positive : colors.negative;
  const label = choice === "up" ? "Upvote" : "Downvote";

  return (
    <PressableScale
      onPress={() => {
        hapticImpact(Haptics.ImpactFeedbackStyle.Medium);
        onPress();
      }}
      disabled={disabled}
      pressedScale={0.94}
      accessibilityLabel={`${label}, ${count} votes${active ? ", your vote. Tap again to remove" : ""}`}
      accessibilityState={{ selected: active, disabled: !!disabled }}
      style={[
        styles.button,
        compact && styles.buttonCompact,
        active && { backgroundColor: `${tone}24`, borderColor: `${tone}99` },
      ]}
    >
      <Ionicons
        name={choice === "up" ? (active ? "thumbs-up" : "thumbs-up-outline") : active ? "thumbs-down" : "thumbs-down-outline"}
        size={compact ? 16 : 18}
        color={active ? tone : colors.subtext}
      />
      <Text style={[styles.count, active && { color: tone }]}>{count}</Text>
    </PressableScale>
  );
}

export function VoteButtons({ tally, myChoice, onPress, disabled, compact, showBar }: Props) {
  const upvotes = tally?.upvotes ?? 0;
  const downvotes = tally?.downvotes ?? 0;
  const total = upvotes + downvotes;
  const upShare = total > 0 ? upvotes / total : 0.5;

  return (
    <View style={styles.wrap}>
      {showBar ? (
        <View style={styles.barRow}>
          {total > 0 ? (
            <View style={styles.bar} accessibilityLabel={`${Math.round(upShare * 100)} percent positive`}>
              {upvotes > 0 ? <View style={[styles.barUp, { flex: upvotes }]} /> : null}
              {downvotes > 0 ? <View style={[styles.barDown, { flex: downvotes }]} /> : null}
            </View>
          ) : (
            <View style={[styles.bar, styles.barEmpty]} />
          )}
          <Text style={styles.barText}>{total > 0 ? `${Math.round(upShare * 100)}% positive` : "No votes yet"}</Text>
        </View>
      ) : null}
      <View style={styles.row}>
        <VoteButton
          choice="up"
          count={upvotes}
          active={myChoice === "up"}
          onPress={() => onPress("up")}
          disabled={disabled}
          compact={compact}
        />
        <VoteButton
          choice="down"
          count={downvotes}
          active={myChoice === "down"}
          onPress={() => onPress("down")}
          disabled={disabled}
          compact={compact}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.sm,
  },
  row: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  button: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    minHeight: layout.touch,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.panel,
    borderRadius: radius.md,
  },
  buttonCompact: {
    minHeight: layout.touch - 4,
  },
  count: {
    ...typography.bodyStrong,
    color: colors.text,
    fontVariant: ["tabular-nums"],
  },
  barRow: {
    gap: spacing.xs,
  },
  bar: {
    flexDirection: "row",
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
    gap: 2,
  },
  barUp: {
    backgroundColor: colors.positive,
    borderRadius: 3,
  },
  barDown: {
    backgroundColor: colors.negative,
    borderRadius: 3,
  },
  barEmpty: {
    backgroundColor: colors.panelStrong,
  },
  barText: {
    ...typography.caption,
    color: colors.subtext,
  },
});
