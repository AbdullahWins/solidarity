import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect } from "react";
import { Modal, StyleSheet, Text, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSpring,
  withTiming,
} from "react-native-reanimated";

import { colors, radius, spacing, typography } from "../../constants/theme";
import { getRankTitle } from "../../lib/gamification";
import { hapticNotification } from "../../lib/haptics";
import { Button } from "../ui/Button";
import { RankTitle } from "./RankTitle";

type Props = {
  visible: boolean;
  level: number;
  onDismiss: () => void;
};

export function LevelUpModal({ visible, level, onDismiss }: Props) {
  const scale = useSharedValue(0.7);
  const opacity = useSharedValue(0);
  const spin = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      scale.value = withSpring(1, { damping: 11, stiffness: 140 });
      opacity.value = withTiming(1, { duration: 220 });
      spin.value = 0;
      spin.value = withDelay(150, withRepeat(withTiming(1, { duration: 9000, easing: Easing.linear }), -1));
      hapticNotification(Haptics.NotificationFeedbackType.Success);
    } else {
      scale.value = 0.7;
      opacity.value = 0;
    }
  }, [visible, level, scale, opacity, spin]);

  const card = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }], opacity: opacity.value }));
  const rays = useAnimatedStyle(() => ({ transform: [{ rotate: `${spin.value * 360}deg` }] }));

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      navigationBarTranslucent
      supportedOrientations={["portrait", "landscape", "portrait-upside-down", "landscape-left", "landscape-right"]}
      onRequestClose={onDismiss}
    >
      <View style={styles.backdrop}>
        <Animated.View style={[styles.card, card]} accessibilityViewIsModal accessibilityLiveRegion="assertive">
          <LinearGradient
            colors={["rgba(251, 191, 36, 0.22)", "rgba(240, 100, 60, 0.08)", "rgba(14, 16, 21, 0)"]}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.trophyWrap}>
            <Animated.View style={[styles.rays, rays]}>
              <LinearGradient
                colors={["rgba(251, 191, 36, 0.45)", "rgba(251, 191, 36, 0)"]}
                style={styles.raysInner}
              />
            </Animated.View>
            <LinearGradient colors={[colors.gold, colors.goldStrong]} style={styles.trophy}>
              <Ionicons name="trophy" size={40} color="#3A2500" />
            </LinearGradient>
          </View>
          <Text style={styles.overline}>Level up</Text>
          <Text style={styles.level}>Level {level}</Text>
          <Text style={styles.subtitle}>You reached {getRankTitle(level)} rank. Keep scanning and voting to climb.</Text>
          <RankTitle level={level} />
          <Button label="Keep going" variant="brand" onPress={onDismiss} style={styles.button} />
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
  },
  card: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: colors.bgElevated,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(251, 191, 36, 0.35)",
    borderRadius: radius.xxl,
    padding: spacing.xxl,
    alignItems: "center",
    gap: spacing.sm,
    overflow: "hidden",
  },
  trophyWrap: {
    width: 120,
    height: 120,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
  },
  rays: {
    position: "absolute",
    width: 120,
    height: 120,
  },
  raysInner: {
    flex: 1,
    borderRadius: 60,
  },
  trophy: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  overline: {
    ...typography.overline,
    color: colors.gold,
  },
  level: {
    ...typography.hero,
    color: colors.text,
  },
  subtitle: {
    ...typography.body,
    color: colors.subtext,
    textAlign: "center",
    marginBottom: spacing.xs,
  },
  button: {
    alignSelf: "stretch",
    marginTop: spacing.md,
  },
});
