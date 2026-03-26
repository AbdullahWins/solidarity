import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useColorScheme,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useIsFocused } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";

import { countryCodeMap } from "../constants/country-map";
import { getStyles } from "../components/styles/styles-barcode";

type ActiveTab = "search" | "scanner";

type ScanRecord = {
  id: string;
  code: string;
  country: string;
  isPositive: boolean;
  source: "camera" | "manual";
  scannedAt: string;
};

type BarcodeScanningResult = {
  data: string;
};

const identifyCountry = (barcode: string | null): string | null => {
  if (!barcode || typeof barcode !== "string") return null;

  const cleanBarcode = barcode.replace(/\D/g, "");
  if (cleanBarcode.length < 3) return null;

  const prefix = cleanBarcode.substring(0, 3);
  const prefixNum = parseInt(prefix, 10);

  if (countryCodeMap[prefix]) return countryCodeMap[prefix];

  for (const key of Object.keys(countryCodeMap)) {
    if (!key.includes("-")) continue;
    const [min, max] = key.split("-").map(Number);
    if (prefixNum >= min && prefixNum <= max) {
      return countryCodeMap[key];
    }
  }

  return null;
};

const isPositiveCountry = (country: string): boolean => {
  const normalized = country.toLowerCase();
  return (
    normalized.includes("india") ||
    normalized.includes("israel") ||
    normalized.includes("usa") ||
    normalized.includes("united states") ||
    normalized.includes("america") ||
    normalized.includes("canada")
  );
};

const getCurrentDateTime = () =>
  new Date().toISOString().replace("T", " ").substring(0, 19);

export default function CustomBarcodeScanner() {
  const isDark = useColorScheme() === "dark";
  const isFocused = useIsFocused();
  const styles = getStyles(isDark);

  const [activeTab, setActiveTab] = useState<ActiveTab>("search");
  const [manualCode, setManualCode] = useState<string>("");
  const [cameraKey, setCameraKey] = useState<number>(0);
  const [readyToScan, setReadyToScan] = useState<boolean>(true);
  const [history, setHistory] = useState<ScanRecord[]>([]);
  const [latestRecord, setLatestRecord] = useState<ScanRecord | null>(null);

  const [permission, requestPermission] = useCameraPermissions();

  useEffect(() => {
    if (isFocused && activeTab === "search") {
      setReadyToScan(true);
      setCameraKey((value) => value + 1);
    }
  }, [activeTab, isFocused]);

  const stats = useMemo(() => {
    const total = history.length;
    const positive = history.filter((item) => item.isPositive).length;
    const negative = total - positive;
    return { total, positive, negative };
  }, [history]);

  const addScanRecord = (barcode: string, source: "camera" | "manual") => {
    const country = identifyCountry(barcode) || "Unknown";
    const positive = isPositiveCountry(country);

    const record: ScanRecord = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      code: barcode,
      country,
      isPositive: positive,
      source,
      scannedAt: getCurrentDateTime(),
    };

    setLatestRecord(record);
    setHistory((current) => [record, ...current].slice(0, 60));
    setActiveTab("scanner");
  };

  const handleBarCodeScanned = ({ data }: BarcodeScanningResult) => {
    if (!readyToScan) return;

    if (!data) {
      Alert.alert("Invalid Scan", "No barcode value was detected.");
      return;
    }
  };

  const handleManualSearch = () => {
    const cleaned = manualCode.trim();
    if (!cleaned) {
      Alert.alert("Missing Barcode", "Enter a barcode to continue.");
      return;
    }

    addScanRecord(cleaned, "manual");
    setManualCode("");
  };

  const prepareNextScan = () => {
    setActiveTab("search");
    setReadyToScan(true);
    setCameraKey((value) => value + 1);
  };

  const clearHistory = () => {
    setHistory([]);
    setLatestRecord(null);
  };

  if (!permission) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.centeredState}>
          <Text style={styles.stateTitle}>Preparing camera</Text>
          <Text style={styles.stateText}>Checking permission status...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.centeredState}>
          <Text style={styles.stateTitle}>Camera permission required</Text>
          <Text style={styles.stateText}>
            Allow camera access to scan product barcodes.
          </Text>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={requestPermission}
          >
            <Text style={styles.primaryButtonText}>Grant Permission</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={["left", "right"]}>
      <StatusBar hidden />
      <View style={styles.mainContent}>
        {activeTab === "scanner" ? (
          <ScrollView
            contentContainerStyle={styles.searchContent}
            showsVerticalScrollIndicator={false}
          >
          <View style={styles.cameraCard}>
            <View style={styles.cameraFrame}>
              {isFocused ? (
                <CameraView
                  key={`camera-${cameraKey}`}
                  style={styles.camera}
                  onBarcodeScanned={readyToScan ? handleBarCodeScanned : undefined}
                  barcodeScannerSettings={{
                    barcodeTypes: ["qr", "upc_e", "ean13", "ean8"],
                  }}
                />
              ) : (
                <View style={styles.camera} />
              )}
              <View pointerEvents="none" style={styles.scanGuideWrap}>
                <View style={styles.scanGuideLine} />
                <View style={[styles.scanEdgeMark, styles.scanEdgeMarkLeft]} />
                <View style={[styles.scanEdgeMark, styles.scanEdgeMarkRight]} />
              </View>
            </View>

            <Text style={styles.scanHintText}>
              {readyToScan
                ? "Point camera at a barcode"
                : "Captured. Open Search tab to view analytics."}
            </Text>

            {!readyToScan && (
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={prepareNextScan}
              >
                <Text style={styles.secondaryButtonText}>Scan Another</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.manualCard}>
            <Text style={styles.manualTitle}>Manual barcode lookup</Text>
            <View style={styles.manualRow}>
              <TextInput
                style={styles.manualInput}
                value={manualCode}
                onChangeText={setManualCode}
                placeholder="Enter barcode number"
                placeholderTextColor={isDark ? "#94a3b8" : "#6b7280"}
                keyboardType="number-pad"
              />
              <TouchableOpacity
                style={styles.manualButton}
                onPress={handleManualSearch}
              >
                <Text style={styles.manualButtonText}>Analyze</Text>
              </TouchableOpacity>
            </View>
          </View>
          </ScrollView>
        ) : (
          <ScrollView
            contentContainerStyle={styles.analyticsContent}
            showsVerticalScrollIndicator={false}
          >
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Total scans</Text>
              <Text style={styles.statValue}>{stats.total}</Text>
            </View>
            <View style={[styles.statCard, styles.positiveCard]}>
              <Text style={styles.statLabel}>Positive scans</Text>
              <Text style={styles.statValue}>{stats.positive}</Text>
            </View>
            <View style={[styles.statCard, styles.negativeCard]}>
              <Text style={styles.statLabel}>Negative scans</Text>
              <Text style={styles.statValue}>{stats.negative}</Text>
            </View>
          </View>

          {latestRecord && (
            <View style={styles.latestCard}>
              <Text style={styles.latestTitle}>Latest result</Text>
              <Text style={styles.latestCountry}>{latestRecord.country}</Text>
              <Text style={styles.latestMeta}>Barcode: {latestRecord.code}</Text>
              <Text style={styles.latestMeta}>Source: {latestRecord.source}</Text>
              <Text
                style={[
                  styles.latestTone,
                  latestRecord.isPositive
                    ? styles.positiveTone
                    : styles.negativeTone,
                ]}
              >
                {latestRecord.isPositive ? "Positive" : "Negative"}
              </Text>
            </View>
          )}

          <View style={styles.historySection}>
            <View style={styles.historyHeader}>
              <Text style={styles.historyTitle}>Recent scans</Text>
              <TouchableOpacity onPress={clearHistory}>
                <Text style={styles.clearHistoryText}>Clear</Text>
              </TouchableOpacity>
            </View>

            {history.length === 0 ? (
              <View style={styles.emptyStateCard}>
                <Text style={styles.emptyStateText}>
                  No scans yet. Use Scanner tab to start scanning.
                </Text>
              </View>
            ) : (
              history.map((item) => (
                <View key={item.id} style={styles.historyItem}>
                  <View>
                    <Text style={styles.historyCountry}>{item.country}</Text>
                    <Text style={styles.historyCode}>{item.code}</Text>
                  </View>
                  <View style={styles.historyRight}>
                    <Text
                      style={[
                        styles.historyTone,
                        item.isPositive ? styles.positiveTone : styles.negativeTone,
                      ]}
                    >
                      {item.isPositive ? "Positive" : "Negative"}
                    </Text>
                    <Text style={styles.historyTime}>{item.scannedAt}</Text>
                  </View>
                </View>
              ))
            )}
          </View>
          </ScrollView>
        )}
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[
            styles.tabButton,
            activeTab === "scanner" ? styles.tabButtonActive : undefined,
          ]}
          onPress={() => setActiveTab("scanner")}
        >
          <Text
            style={[
              styles.tabButtonText,
              activeTab === "scanner" ? styles.tabButtonTextActive : undefined,
            ]}
          >
            Scanner
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tabButton,
            activeTab === "search" ? styles.tabButtonActive : undefined,
          ]}
          onPress={() => setActiveTab("search")}
        >
          <Text
            style={[
              styles.tabButtonText,
              activeTab === "search" ? styles.tabButtonTextActive : undefined,
            ]}
          >
            Search
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
