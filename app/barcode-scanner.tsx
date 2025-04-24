import React, { useState, useEffect, useRef } from "react";
import {
  Text,
  View,
  Alert,
  ScrollView,
  TextInput,
  TouchableOpacity,
  useColorScheme,
  Animated,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useRouter } from "expo-router";
import { getStyles } from "../components/styles/styles-barcode";
import { countryCodeMap } from "./country-map";

interface BarcodeScanningResult {
  type: string;
  data: string;
  bounds?: any;
}

// Function to identify country from barcode
const identifyCountry = (barcode: string | null): string | null => {
  if (!barcode || typeof barcode !== "string") return null;

  // Clean the barcode - remove any non-numeric characters
  const cleanBarcode = barcode.replace(/\D/g, "");

  // Check if barcode is long enough
  if (cleanBarcode.length < 3) return null;

  // Get first 3 digits
  const prefix = cleanBarcode.substring(0, 3);
  const prefixNum = parseInt(prefix, 10);

  // Check exact match first
  if (countryCodeMap[prefix]) return countryCodeMap[prefix];

  // Check range matches
  for (const key of Object.keys(countryCodeMap)) {
    if (key.includes("-")) {
      const [min, max] = key.split("-").map((k) => parseInt(k, 10));
      if (prefixNum >= min && prefixNum <= max) {
        return countryCodeMap[key];
      }
    }
  }

  return null;
};

// Function to check if country should be flagged
const shouldFlagCountry = (country: string | null): boolean => {
  if (!country) return false;

  const lowercaseCountry = country.toLowerCase();
  return (
    lowercaseCountry.includes("india") ||
    lowercaseCountry.includes("israel") ||
    lowercaseCountry.includes("usa") ||
    lowercaseCountry.includes("united states") ||
    lowercaseCountry.includes("america") ||
    lowercaseCountry.includes("canada")
  );
};

export default function CustomBarcodeScanner() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const styles = getStyles(isDark);

  const [scanned, setScanned] = useState<boolean>(false);
  const [showCamera, setShowCamera] = useState<boolean>(true);
  const [originCountry, setOriginCountry] = useState<string | null>(null);
  const [barcodeData, setBarcodeData] = useState<string | null>(null);
  const [searchText, setSearchText] = useState<string>("");
  const [lastScanTime, setLastScanTime] = useState<string | null>(null);

  // Animated fade effect for the camera view
  const fadeAnim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(fadeAnim, {
          toValue: 0.3,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [fadeAnim]);

  // Animation Camera border
  const borderAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(borderAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: false,
        }),
        Animated.timing(borderAnim, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: false,
        }),
      ])
    ).start();
  }, []);

  const animatedBorderStyle = {
    borderColor: borderAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [
        isDark ? "#8b5cf6" : "#7e22ce",
        isDark ? "#7c3aed" : "#5b21b6",
      ],
    }),
    borderWidth: borderAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [2, 4],
    }),
  };

  // Camera permissions
  const [permission, requestPermission] = useCameraPermissions();

  // Router for expo-router
  const router = useRouter();

  // Current date/time
  const getCurrentDateTime = () => {
    return new Date().toISOString().replace("T", " ").substring(0, 19);
  };

  // Reset scanner when the screen comes into focus
  useEffect(() => {
    if (showCamera) {
      setScanned(false);
    }
  }, [showCamera]);

  const handleBarCodeScanned = (scanningResult: BarcodeScanningResult) => {
    if (scanned) return;

    const { type, data } = scanningResult;
    setScanned(true);
    setBarcodeData(data);
    setLastScanTime(getCurrentDateTime());

    try {
      console.log("Scanned data:", data);

      // Check if data is valid
      if (!data) {
        Alert.alert("Invalid Data", "No barcode data received");
        setTimeout(() => setScanned(false), 2000);
        return;
      }

      // Identify country from barcode
      const country = identifyCountry(data);
      setOriginCountry(country || "Unknown");
      setShowCamera(false); // Always show results
    } catch (error) {
      console.error("Error processing barcode:", error);
      Alert.alert("Error", "Failed to process barcode data");
      setTimeout(() => setScanned(false), 2000);
    }
  };

  const searchBarcode = () => {
    if (!searchText.trim()) {
      Alert.alert("Error", "Please enter a barcode");
      return;
    }

    // Identify country from search text if it's a barcode
    const country = identifyCountry(searchText);
    setOriginCountry(country || "Unknown");
    setBarcodeData(searchText);
    setLastScanTime(getCurrentDateTime());

    if (country) {
      setShowCamera(false); // Show results
    } else {
      Alert.alert("Not Found", "Could not identify country from this barcode");
    }
  };

  const resetSearch = () => {
    setScanned(false);
    setSearchText("");
    setOriginCountry(null);
    setBarcodeData(null);
    setLastScanTime(null);
    setShowCamera(true);
  };

  if (!permission) {
    // Camera permissions are still loading
    return (
      <View style={styles.safeArea}>
        <Text style={styles.paragraph}>Requesting camera permission...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    // Camera permissions are not granted yet
    return (
      <View style={styles.cameraPermissionContainer}>
        {/* <Text style={styles.paragraph}>No access to camera</Text> */}
        <TouchableOpacity
          style={styles.permissionToggleButton}
          onPress={requestPermission}
        >
          <Text style={styles.cameraAccessText}>Grant Camera Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Toggle buttons at the top */}
      <View style={styles.toggleContainer}>
        <TouchableOpacity
          style={[styles.toggleButton, showCamera && styles.activeToggle]}
          onPress={() => {
            setShowCamera(true);
            setScanned(false);
          }}
        >
          <Text style={styles.toggleButtonText}>Scanner</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggleButton, !showCamera && styles.activeToggle]}
          onPress={() => setShowCamera(false)}
        >
          <Text style={styles.toggleButtonText}>Search</Text>
        </TouchableOpacity>
      </View>

      {/* Main content area */}
      <View style={styles.content}>
        {showCamera ? (
          // Camera Scanner View - SMALLER SIZE
          <View style={styles.cameraContainer}>
            <View style={styles.cameraBoundingBox}>
              {!scanned && (
                <CameraView
                  style={styles.camera}
                  onBarcodeScanned={handleBarCodeScanned}
                  barcodeScannerSettings={{
                    barcodeTypes: ["qr", "upc_e", "ean13"],
                  }}
                />
              )}
            </View>
            <View style={styles.scanOverlay}>
              <Animated.Text style={[styles.scanText, { opacity: fadeAnim }]}>
                🕵️ Scanning...
              </Animated.Text>
            </View>
          </View>
        ) : (
          // Search View
          <View style={styles.searchContainer}>
            {/* Search bar - only in search tab */}
            <View style={styles.searchBarContainer}>
              <TextInput
                style={styles.searchInput}
                value={searchText}
                onChangeText={setSearchText}
                placeholder="Enter barcode number..."
                placeholderTextColor={isDark ? "#94a3b8" : "#999"}
                keyboardType="numeric"
              />
              <TouchableOpacity
                style={styles.searchButton}
                onPress={searchBarcode}
              >
                <Text style={styles.searchButtonText}>Check</Text>
              </TouchableOpacity>
            </View>

            {/* Results Area */}
            <ScrollView
              style={styles.resultsScroll}
              contentContainerStyle={
                originCountry ? styles.resultsWithContent : styles.resultsEmpty
              }
            >
              {originCountry ? (
                <View style={styles.resultsContainer}>
                  {/* Origin country information */}
                  <View
                    style={[
                      styles.countryCard,
                      shouldFlagCountry(originCountry)
                        ? styles.flaggedCountryCard
                        : styles.safeCountryCard,
                    ]}
                  >
                    <Text style={styles.countryName}>{originCountry}</Text>

                    <Text style={styles.fieldLabel}>Product Barcode:</Text>
                    <Text style={styles.barcodeText}>{barcodeData}</Text>

                    {shouldFlagCountry(originCountry) ? (
                      <View style={styles.flaggedAlert}>
                        <Text style={styles.flaggedText}>
                          This product's barcode is registered in{" "}
                          {originCountry}
                        </Text>
                      </View>
                    ) : (
                      <View style={styles.safeAlert}>
                        <Text style={styles.safeText}>
                          This product's barcode is registered in{" "}
                          {originCountry}
                        </Text>
                      </View>
                    )}

                    {lastScanTime && (
                      <Text style={styles.timestampText}>
                        Scanned: {lastScanTime}
                      </Text>
                    )}
                  </View>

                  <Text style={styles.disclaimerText}>
                    Note: This indicates where the barcode was registered, not
                    necessarily where the product was manufactured.
                  </Text>

                  <TouchableOpacity
                    style={styles.resetButton}
                    onPress={resetSearch}
                  >
                    <Text style={styles.resetButtonText}>Scan Again</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>
                    {searchText.trim()
                      ? "Enter a complete barcode number to check origin."
                      : "Enter a barcode number or scan a product barcode."}
                  </Text>
                </View>
              )}
            </ScrollView>
          </View>
        )}
      </View>
    </View>
  );
}
