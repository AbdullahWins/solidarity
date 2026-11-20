import { Ionicons } from "@expo/vector-icons";
import { useCameraPermissions } from "expo-camera";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useRef, useState } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
import Animated, { FadeIn, FadeInDown, useAnimatedStyle, withSpring } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Button } from "../components/ui/Button";
import { Flag } from "../components/ui/Flag";
import { colors, radius, spacing, typography } from "../constants/theme";
import { markOnboarded } from "../lib/onboarding";

const logo = require("../assets/images/logo.png");

type Step = {
  key: string;
  overline: string;
  title: string;
  body: string;
  art: React.ReactNode;
};

function Halo({ children, tint }: { children: React.ReactNode; tint: string }) {
  return (
    <View style={styles.halo}>
      <LinearGradient colors={[`${tint}55`, `${tint}00`]} style={styles.haloGlow} />
      <LinearGradient colors={[`${tint}33`, "rgba(18,21,28,0.9)"]} style={styles.haloDisc}>
        {children}
      </LinearGradient>
    </View>
  );
}

function Chip({ children, style }: { children: React.ReactNode; style: object }) {
  return <View style={[styles.chip, style]}>{children}</View>;
}

const buildSteps = (): Step[] => [
  {
    key: "scan",
    overline: "Step 1 of 3",
    title: "Scan any product",
    body: "Point your camera at a barcode, or type the number. We read its GS1 prefix to find the country it's registered in.",
    art: (
      <Halo tint={colors.brand}>
        <Ionicons name="barcode-outline" size={84} color={colors.text} />
        <View style={styles.scanLine} />
        <Chip style={{ top: 18, right: -20 }}>
          <Ionicons name="checkmark-circle" size={14} color={colors.positive} />
          <Text style={styles.chipText}>Check digit OK</Text>
        </Chip>
      </Halo>
    ),
  },
  {
    key: "vote",
    overline: "Step 2 of 3",
    title: "The community decides",
    body: "Each country's colour comes from open up and down votes. Anyone can see the counts, and verified members can vote.",
    art: (
      <Halo tint={colors.accent}>
        <Ionicons name="people" size={74} color={colors.text} />
        <Chip style={{ top: 10, left: -34 }}>
          <Flag country="Portugal" size={14} />
          <Text style={styles.chipText}>👍 78%</Text>
        </Chip>
        <Chip style={{ bottom: 22, right: -38 }}>
          <Flag country="Japan" size={14} />
          <Text style={styles.chipText}>👍 64%</Text>
        </Chip>
        <Chip style={{ bottom: -6, left: -10 }}>
          <Flag country="Brazil" size={14} />
          <Text style={styles.chipText}>👎 55%</Text>
        </Chip>
      </Halo>
    ),
  },
  {
    key: "privacy",
    overline: "Step 3 of 3",
    title: "Private by design",
    body: "Your scan history never leaves your phone. An account is optional and only backs up your progress and votes.",
    art: (
      <Halo tint={colors.positive}>
        <Ionicons name="shield-checkmark" size={78} color={colors.text} />
        <Chip style={{ top: 20, left: -36 }}>
          <Ionicons name="phone-portrait-outline" size={13} color={colors.accent} />
          <Text style={styles.chipText}>On-device</Text>
        </Chip>
        <Chip style={{ bottom: 18, right: -30 }}>
          <Ionicons name="eye-off-outline" size={13} color={colors.gold} />
          <Text style={styles.chipText}>No ads or tracking</Text>
        </Chip>
      </Halo>
    ),
  },
];

function Dot({ active }: { active: boolean }) {
  const style = useAnimatedStyle(() => ({
    width: withSpring(active ? 22 : 7, { damping: 18, stiffness: 220 }),
    backgroundColor: active ? colors.text : colors.panelStrong,
  }));
  return <Animated.View style={[styles.dot, style]} />;
}

export default function OnboardingScreen() {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<React.ComponentRef<typeof ScrollView>>(null);
  const STEPS = buildSteps();
  const [index, setIndex] = useState(0);
  const [, requestPermission] = useCameraPermissions();
  const last = index === STEPS.length - 1;
  const landscape = width > height;

  const finish = async (askCamera: boolean) => {
    if (askCamera && Platform.OS !== "web") await requestPermission().catch(() => {});
    await markOnboarded();
    if (router.canGoBack()) router.back();
    else router.replace("/");
  };

  const goTo = (i: number) => {
    scrollRef.current?.scrollTo({ x: i * width, animated: true });
    setIndex(i);
  };

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const i = Math.round(e.nativeEvent.contentOffset.x / width);
    if (i !== index) setIndex(i);
  };

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <LinearGradient
        colors={["rgba(240,100,60,0.16)", "rgba(109,136,250,0.08)", "rgba(7,8,11,0)"]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      <View style={[styles.top, { paddingTop: insets.top + spacing.md, paddingHorizontal: insets.left + spacing.xl }]}>
        <View style={styles.brand}>
          <Image source={logo} style={styles.logo} contentFit="contain" />
          <Text style={styles.brandText}>Solidarity</Text>
        </View>
        {!last ? (
          <Pressable onPress={() => finish(false)} hitSlop={12} accessibilityRole="button" style={styles.skip}>
            <Text style={styles.skipText}>Skip</Text>
          </Pressable>
        ) : null}
      </View>

      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScroll}
        onScroll={Platform.OS === "web" ? onScroll : undefined}
        scrollEventThrottle={32}
        style={styles.pager}
      >
        {STEPS.map((step, i) => (
          <View
            key={step.key}
            style={[styles.page, { width }, landscape && styles.pageLandscape]}
            accessibilityElementsHidden={i !== index}
            importantForAccessibility={i === index ? "auto" : "no-hide-descendants"}
          >
            <View
              style={[
                styles.artWrap,
                landscape && { flex: 1, marginBottom: 0 },
                { transform: [{ scale: Math.min(width, height) >= 700 ? 1.35 : height < 500 ? 0.8 : 1 }] },
              ]}
            >
              {step.art}
            </View>
            <Animated.View
              key={`${step.key}-${index === i}`}
              entering={FadeInDown.duration(420)}
              style={[styles.copy, landscape && { flex: 1, alignItems: "flex-start" }]}
            >
              <Text style={styles.overline}>{step.overline}</Text>
              <Text style={[styles.title, landscape && { textAlign: "left" }]} accessibilityRole="header">
                {step.title}
              </Text>
              <Text style={[styles.body, landscape && { textAlign: "left" }]}>{step.body}</Text>
            </Animated.View>
          </View>
        ))}
      </ScrollView>

      <Animated.View
        entering={FadeIn.delay(200)}
        style={[
          styles.footer,
          {
            paddingBottom: insets.bottom + spacing.lg,
            paddingLeft: insets.left + spacing.xl,
            paddingRight: insets.right + spacing.xl,
          },
        ]}
      >
        <View style={styles.dots} accessibilityLabel={`Step ${index + 1} of ${STEPS.length}`}>
          {STEPS.map((s, i) => (
            <Dot key={s.key} active={i === index} />
          ))}
        </View>
        <View style={styles.actions}>
          {last ? (
            <>
              <Button
                label={Platform.OS === "web" ? "Get started" : "Enable camera & start"}
                icon={Platform.OS === "web" ? "arrow-forward" : "camera"}
                variant="brand"
                size="lg"
                onPress={() => finish(true)}
              />
              {Platform.OS !== "web" ? (
                <Button label="Not now" variant="ghost" onPress={() => finish(false)} />
              ) : null}
            </>
          ) : (
            <Button label="Continue" icon="arrow-forward" variant="brand" size="lg" onPress={() => goTo(index + 1)} />
          )}
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  top: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 44,
  },
  brand: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  logo: {
    width: 30,
    height: 30,
    borderRadius: 9,
  },
  brandText: {
    ...typography.bodyStrong,
    color: colors.text,
  },
  skip: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.panel,
  },
  skipText: {
    ...typography.caption,
    color: colors.subtext,
  },
  pager: {
    flex: 1,
  },
  page: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xxl,
  },
  pageLandscape: {
    flexDirection: "row",
    gap: spacing.xxl,
    paddingHorizontal: 64,
  },
  artWrap: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xxl,
  },
  halo: {
    width: 240,
    height: 240,
    alignItems: "center",
    justifyContent: "center",
  },
  haloGlow: {
    position: "absolute",
    width: 240,
    height: 240,
    borderRadius: 120,
  },
  haloDisc: {
    width: 168,
    height: 168,
    borderRadius: 84,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderStrong,
  },
  scanLine: {
    position: "absolute",
    left: 34,
    right: 34,
    height: 3,
    borderRadius: 2,
    backgroundColor: colors.brand,
    shadowColor: colors.brand,
    shadowOpacity: 0.9,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
  },
  chip: {
    position: "absolute",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceHigh,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderStrong,
  },
  chipText: {
    ...typography.caption,
    color: colors.text,
  },
  copy: {
    alignItems: "center",
    maxWidth: 440,
    gap: spacing.sm,
  },
  overline: {
    ...typography.overline,
    color: colors.brandSoft,
  },
  title: {
    ...typography.display,
    color: colors.text,
    textAlign: "center",
  },
  body: {
    ...typography.body,
    fontSize: 16,
    lineHeight: 23,
    color: colors.subtext,
    textAlign: "center",
  },
  footer: {
    gap: spacing.lg,
    alignItems: "center",
  },
  dots: {
    flexDirection: "row",
    gap: 6,
  },
  dot: {
    height: 7,
    borderRadius: 4,
  },
  actions: {
    width: "100%",
    maxWidth: 440,
    gap: spacing.xs,
  },
});
