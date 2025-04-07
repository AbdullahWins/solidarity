import React from "react";
import { Stack } from "expo-router";
import CustomBarcodeScanner from "../barcode-scanner";

export default function HomeScreen() {
  return (
    <>
      <Stack.Screen options={{ title: "Solidarity" }} />
      <CustomBarcodeScanner />
    </>
  );
}
