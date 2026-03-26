// AboutUs.tsx
import React from "react";
import { Stack } from "expo-router";
import { Image } from "react-native";
import {
  Text,
  ScrollView,
  View,
  useColorScheme,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView } from "react-native-safe-area-context";
import { getStyles } from "../../components/styles/styles-tab";

export default function AboutUs() {
  const theme = useColorScheme();
  const isDark = theme === "dark";
  const styles = getStyles(isDark);

  return (
    <>
      <Stack.Screen
        options={{
          title: "About Us",
          headerStyle: {
            height: 52,
          },
          headerTitleStyle: {
            fontSize: 17,
          },
          headerRight: () => (
            <Image
              source={require("../../assets/images/icon.png")}
              accessibilityLabel="Solidarity Logo"
              accessibilityRole="image"
              style={{ width: 28, height: 28, marginRight: 10 }}
            />
          ),
        }}
      />
      <SafeAreaView style={styles.safeArea}>
        <StatusBar style="light" />
        <View style={styles.wrapper}>
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.contentContainer}
            showsVerticalScrollIndicator={false}
            alwaysBounceVertical
          >
            <View style={styles.heroCard}>
              <Text style={styles.title}>Know What You Buy</Text>
              <Text style={styles.paragraph}>
                Check any barcode fast and see where it is registered.
              </Text>
            </View>

            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>How It Works</Text>
              <Text style={styles.paragraph}>
                We read the GS1 prefix and map it to its country range.
              </Text>
            </View>

            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Important Context</Text>
              <Text style={styles.paragraph}>
                This is barcode registration, not always manufacturing origin.
              </Text>
            </View>

            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Privacy First</Text>
              <Text style={styles.paragraph}>
                Scanning is on-device. Your data stays on your phone.
              </Text>
            </View>

            <Text style={styles.footer}>Built with ❤️ and Solidarity.</Text>
          </ScrollView>
        </View>
      </SafeAreaView>
    </>
  );
}
