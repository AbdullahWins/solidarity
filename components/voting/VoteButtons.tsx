import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withTiming } from "react-native-reanimated";

import { colors, radius, spacing, typography } from "../../constants/theme";
import { hapticNotification } from "../../lib/haptics";
import type { CountryTally, VoteChoice } from "../../lib/votes";

type Props = {
  tally: CountryTally | undefined;
  myChoice: VoteChoice | undefined;
  onPress: (choice: VoteChoice) => void;
  disabled?: boolean;
  compact?: boolean;
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
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const handlePress = () => {
    scale.value = withSequence(withTiming(0.85, { duration: 80 }), withTiming(1, { duration: 120 }));
    hapticNotification(Haptics.NotificationFeedbackType.Success);
    onPress();
  };

  const tone = choice === "up" ? colors.positive : colors.negative;

  return (
    <Animated.View style={[animatedStyle, { flex: 1 }]}>
      <TouchableOpacity
        onPress={handlePress}
        disabled={disabled}
        activeOpacity={0.8}
        style={[
          styles.button,
          compact && styles.buttonCompact,
          active && { backgroundColor: `${tone}22`, borderColor: `${tone}88` },
          disabled && styles.disabled,
        ]}
      >
        <Ionicons
          name={choice === "up" ? "arrow-up-circle" : "arrow-down-circle"}
          size={compact ? 16 : 18}
          color={active ? tone : colors.subtext}
        />
        <Text style={[styles.buttonText, active && { color: tone }]}>{count}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

export function VoteButtons({ tally, myChoice, onPress, disabled, compact }: Props) {
  const upvotes = tally?.upvotes ?? 0;
  const downvotes = tally?.downvotes ?? 0;

  return (
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
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.panelSoft,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
  },
  buttonCompact: {
    paddingVertical: spacing.xs + 2,
  },
  disabled: {
    opacity: 0.5,
  },
  buttonText: {
    ...typography.caption,
    color: colors.text,
    fontWeight: "700",
  },
});
