import { Ionicons } from "@expo/vector-icons";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React from "react";
import { Image, ScrollView, Share, StyleSheet, Text, TouchableOpacity } from "react-native";
import * as WebBrowser from "expo-web-browser";

import { Card } from "../../components/ui/Card";
import { ScreenContainer } from "../../components/ui/ScreenContainer";
import { APP_NAME, APP_SHARE_URL } from "../../constants/app-info";
import { colors, radius, spacing, typography } from "../../constants/theme";

export default function AboutUs() {
  const openStoreLink = () => {
    WebBrowser.openBrowserAsync(APP_SHARE_URL).catch(() => {});
  };

  const shareApp = () => {
    Share.share({
      message: `Check out ${APP_NAME} — know what you buy: ${APP_SHARE_URL}`,
    }).catch(() => {});
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: "About Us",
          headerTitleStyle: { fontSize: 17 },
          headerRight: () => (
            <Image
              source={require("../../assets/images/icon.png")}
              accessibilityLabel="Solidarity Logo"
              accessibilityRole="image"
              style={{ width: 28, height: 28, marginRight: 10, borderRadius: 6 }}
            />
          ),
        }}
      />
      <ScreenContainer>
        <StatusBar style="light" />
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <Card>
            <Text style={styles.title}>Know What You Buy</Text>
            <Text style={styles.paragraph}>
              Check any barcode fast and see where it is registered.
            </Text>
          </Card>

          <Card>
            <Text style={styles.sectionTitle}>How It Works</Text>
            <Text style={styles.paragraph}>
              We read the GS1 prefix and map it to its country range.
            </Text>
          </Card>

          <Card>
            <Text style={styles.sectionTitle}>Important Context</Text>
            <Text style={styles.paragraph}>
              This is barcode registration, not always manufacturing origin.
            </Text>
          </Card>

          <Card>
            <Text style={styles.sectionTitle}>Privacy First</Text>
            <Text style={styles.paragraph}>
              Scanning is on-device. Your data stays on your phone — nothing is
              uploaded, even your scan history and stats.
            </Text>
          </Card>

          <Card>
            <Text style={styles.sectionTitle}>Enjoying {APP_NAME}?</Text>
            <Text style={styles.paragraph}>
              Share it with friends and family so they can scan smarter too.
            </Text>
            <TouchableOpacity style={styles.linkRow} onPress={shareApp}>
              <Ionicons name="share-social" size={16} color={colors.accent} />
              <Text style={styles.linkText}>Share {APP_NAME}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.linkRow} onPress={openStoreLink}>
              <Ionicons name="star" size={16} color={colors.gold} />
              <Text style={styles.linkText}>Rate on the Play Store</Text>
            </TouchableOpacity>
          </Card>

          <Text style={styles.footer}>Built with ❤️ and Solidarity.</Text>
        </ScrollView>
      </ScreenContainer>
    </>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },
  title: {
    ...typography.title,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  sectionTitle: {
    ...typography.heading,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  paragraph: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.subtext,
  },
  linkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: spacing.md,
    backgroundColor: colors.panelSoft,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
  },
  linkText: {
    ...typography.body,
    color: colors.text,
    fontWeight: "700",
  },
  footer: {
    fontSize: 12,
    textAlign: "center",
    color: colors.muted,
    marginTop: spacing.sm,
  },
});
