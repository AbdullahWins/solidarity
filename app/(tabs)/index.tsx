import React from "react";
import { Stack } from "expo-router";
import { Image } from "react-native";
import CustomBarcodeScanner from "../barcode-scanner";

export default function HomeScreen() {
  return (
    <>
      <Stack.Screen
        options={{
          title: "Solidarity",
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
      <CustomBarcodeScanner />
    </>
  );
}
