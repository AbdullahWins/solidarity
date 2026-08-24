import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useEffect } from "react";
import { Modal, StyleSheet, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";

import { Button } from "../ui/Button";
import { colors, radius, spacing, typography } from "../../constants/theme";
import { getRankTitle } from "../../lib/gamification";
import { hapticNotification } from "../../lib/haptics";
import { RankTitle } from "./RankTitle";

type Props = {
  visible: boolean;
  level: number;
  onDismiss: () => void;
};

export function LevelUpModal({ visible, level, onDismiss }: Props) {
  const scale = useSharedValue(0.6);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      scale.value = withSpring(1, { damping: 9, stiffness: 120 });
      opacity.value = withTiming(1, { duration: 250 });
      hapticNotification(Haptics.NotificationFeedbackType.Success);
    } else {
      scale.value = 0.6;
      opacity.value = 0;
    }
  }, [visible, level, scale, opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const tier = getRankTitle(level);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
      <View style={styles.backdrop}>
        <Animated.View style={[styles.card, animatedStyle]}>
          <Ionicons name="trophy" size={48} color={colors.gold} />
          <Text style={styles.title}>Level Up!</Text>
          <Text style={styles.level}>Level {level}</Text>
          <Text style={styles.subtitle}>You&apos;ve reached {tier} rank.</Text>
          <RankTitle level={level} />
          <Button label="Nice!" onPress={onDismiss} style={{ marginTop: spacing.lg }} />
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.75)",
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
  },
  card: {
    width: "100%",
    maxWidth: 320,
    backgroundColor: colors.bgElevated,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.xxl,
    padding: spacing.xxl,
    alignItems: "center",
    gap: spacing.xs,
  },
  title: {
    ...typography.title,
    color: colors.text,
    marginTop: spacing.sm,
  },
  level: {
    ...typography.display,
    color: colors.gold,
  },
  subtitle: {
    ...typography.body,
    color: colors.subtext,
    marginBottom: spacing.sm,
  },
});
