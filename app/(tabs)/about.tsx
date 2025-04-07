// AboutUs.tsx
import React from "react";
import { Stack } from "expo-router";
import { Image } from "react-native";
import {
  View,
  Text,
  ScrollView,
  SafeAreaView,
  StatusBar,
  useColorScheme,
} from "react-native";
import { getStyles } from "./styles"; // import the styles

export default function AboutUs() {
  const theme = useColorScheme();
  const isDark = theme === "dark";
  const styles = getStyles(isDark); // Get styles dynamically based on theme

  return (
    <>
      <Stack.Screen
        options={{
          title: "About Us",
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
        <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
        <View style={styles.wrapper}>
          <ScrollView
            contentContainerStyle={styles.contentContainer}
            showsVerticalScrollIndicator={false}
          >
            <View>
              <Text style={styles.title}>Know Where It Comes From</Text>
              <Text style={styles.paragraph}>
                Scan any product's barcode to discover where it's registered.
              </Text>

              <Text style={styles.sectionTitle}>How It Works</Text>
              <Text style={styles.paragraph}>
                Barcodes follow international standards. We decode them to
                reveal the country of origin.
              </Text>

              <Text style={styles.sectionTitle}>Heads Up</Text>
              <Text style={styles.paragraph}>
                A barcode’s origin ≠ where the product was made. It's where the
                barcode is registered.
              </Text>

              <Text style={styles.sectionTitle}>Your Privacy</Text>
              <Text style={styles.paragraph}>
                Everything happens on your device. We collect nothing.
              </Text>
            </View>

            <Text style={styles.footer}>Built with ❤️ and Solidarity.</Text>
          </ScrollView>
        </View>
      </SafeAreaView>
    </>
  );
}
