import { StyleSheet } from "react-native";

export const getStyles = (isDark: boolean) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: isDark ? "#0f172a" : "#ffffff",
    },
    toggleContainer: {
      flexDirection: "row",
      backgroundColor: isDark ? "#1e293b" : "#f3f4f6",
      padding: 4,
      marginHorizontal: 16,
      marginVertical: 8,
      borderRadius: 8,
    },
    toggleButton: {
      flex: 1,
      paddingVertical: 8,
      alignItems: "center",
      borderRadius: 6,
    },
    activeToggle: {
      backgroundColor: isDark ? "#334155" : "#ffffff",
      shadowColor: isDark ? "#000" : "#000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: isDark ? 0.3 : 0.1,
      shadowRadius: 1,
      elevation: 1,
    },
    toggleButtonText: {
      fontWeight: "600",
      color: isDark ? "#f8fafc" : "#4b5563",
    },
    content: {
      flex: 1,
    },
    cameraContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: isDark ? "#0f172a" : "#ffffff",
    },
    cameraBoundingBox: {
      width: "80%",
      height: "50%",
      overflow: "hidden",
      borderRadius: 16,
      borderWidth: 2,
      borderColor: isDark ? "#8b5cf6" : "#7e22ce",
    },
    camera: {
      width: "100%",
      height: "100%",
    },
    scanOverlay: {
      marginTop: 16,
    },
    scanText: {
      color: isDark ? "#f8fafc" : "#4b5563",
      fontSize: 18,
      backgroundColor: isDark
        ? "rgba(30, 41, 59, 0.8)"
        : "rgba(255, 255, 255, 0.8)",
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 50,
    },
    searchContainer: {
      flex: 1,
      backgroundColor: isDark ? "#0f172a" : "#ffffff",
    },
    searchBarContainer: {
      flexDirection: "row",
      paddingHorizontal: 16,
      paddingVertical: 12,
      backgroundColor: isDark ? "#1e293b" : "#ffffff",
      borderBottomWidth: 1,
      borderBottomColor: isDark ? "#334155" : "#e5e7eb",
    },
    searchInput: {
      flex: 1,
      height: 40,
      borderWidth: 1,
      borderColor: isDark ? "#334155" : "#d1d5db",
      borderRadius: 8,
      paddingHorizontal: 12,
      backgroundColor: isDark ? "#0f172a" : "#f9fafb",
      color: isDark ? "#e2e8f0" : "#000000",
    },
    searchButton: {
      marginLeft: 8,
      backgroundColor: isDark ? "#8b5cf6" : "#7e22ce",
      justifyContent: "center",
      alignItems: "center",
      paddingHorizontal: 16,
      borderRadius: 8,
    },
    searchButtonText: {
      color: "#ffffff",
      fontWeight: "600",
    },
    resultsScroll: {
      flex: 1,
      backgroundColor: isDark ? "#0f172a" : "#ffffff",
    },
    resultsWithContent: {
      paddingVertical: 20,
      paddingHorizontal: 20,
    },
    resultsEmpty: {
      flexGrow: 1,
      justifyContent: "center",
      alignItems: "center",
      padding: 20,
    },
    resultsContainer: {
      alignItems: "center",
      width: "100%",
    },
    countryCard: {
      padding: 24,
      borderRadius: 12,
      width: "100%",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: isDark ? 0.5 : 0.1,
      shadowRadius: 2,
      elevation: 2,
      marginBottom: 16,
    },
    flaggedCountryCard: {
      backgroundColor: isDark ? "#7f1d1d" : "#fee2e2",
    },
    safeCountryCard: {
      backgroundColor: isDark ? "#064e3b" : "#d1fae5",
    },
    countryName: {
      fontSize: 24,
      fontWeight: "bold",
      marginBottom: 16,
      textAlign: "center",
      color: isDark ? "#f8fafc" : "#1e293b",
    },
    fieldLabel: {
      fontSize: 16,
      marginBottom: 4,
      fontWeight: "500",
      color: isDark ? "#cbd5e1" : "#334155",
    },
    barcodeText: {
      fontSize: 20,
      marginBottom: 16,
      fontFamily: "monospace",
      color: isDark ? "#e2e8f0" : "#1e293b",
    },
    flaggedAlert: {
      backgroundColor: isDark ? "#450a0a" : "#fef2f2",
      padding: 12,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: isDark ? "#b91c1c" : "#fecaca",
    },
    flaggedText: {
      color: isDark ? "#fca5a5" : "#991b1b",
      fontWeight: "500",
      textAlign: "center",
    },
    safeAlert: {
      backgroundColor: isDark ? "#022c22" : "#ecfdf5",
      padding: 12,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: isDark ? "#059669" : "#a7f3d0",
    },
    safeText: {
      color: isDark ? "#6ee7b7" : "#065f46",
      fontWeight: "500",
      textAlign: "center",
    },
    timestampText: {
      fontSize: 12,
      color: isDark ? "#94a3b8" : "#6b7280",
      marginTop: 16,
      textAlign: "right",
    },
    disclaimerText: {
      fontSize: 12,
      color: isDark ? "#94a3b8" : "#6b7280",
      fontStyle: "italic",
      textAlign: "center",
      marginBottom: 16,
    },
    resetButton: {
      backgroundColor: isDark ? "#8b5cf6" : "#8b5cf6",
      paddingHorizontal: 20,
      paddingVertical: 10,
      borderRadius: 8,
      marginTop: 16,
    },
    resetButtonText: {
      color: "#ffffff",
      fontWeight: "600",
      fontSize: 16,
    },
    emptyContainer: {
      alignItems: "center",
      justifyContent: "center",
      padding: 24,
    },
    emptyText: {
      fontSize: 16,
      color: isDark ? "#94a3b8" : "#6b7280",
      textAlign: "center",
      marginBottom: 16,
    },
    centerText: {
      textAlign: "center",
      padding: 16,
      color: isDark ? "#f8fafc" : "#1e293b",
    },
    permissionContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      padding: 16,
      backgroundColor: isDark ? "#0f172a" : "#ffffff",
    },
    baseText: {
      fontSize: 16,
      color: isDark ? "#e2e8f0" : "#1e293b",
    },
    permissionButton: {
      marginTop: 8,
      color: isDark ? "#93c5fd" : "#3b82f6",
      fontWeight: "500",
    },
    // Additional styles from your reference
    safeArea: {
      flex: 1,
      backgroundColor: isDark ? "#0f172a" : "#f9fafb",
    },
    wrapper: {
      flex: 1,
    },
    contentContainer: {
      flexGrow: 1,
      justifyContent: "space-between",
      padding: 24,
      backgroundColor: isDark ? "#0f172a" : "#f9fafb",
    },
    title: {
      fontSize: 28,
      fontWeight: "700",
      marginBottom: 16,
      color: isDark ? "#f8fafc" : "#1e293b",
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: "600",
      marginTop: 24,
      marginBottom: 6,
      color: isDark ? "#cbd5e1" : "#334155",
    },
    paragraph: {
      fontSize: 16,
      lineHeight: 22,
      color: isDark ? "#e2e8f0" : "#475569",
    },
    footer: {
      fontSize: 14,
      marginTop: 32,
      paddingTop: 20,
      borderTopWidth: 1,
      borderTopColor: isDark ? "#1e293b" : "#e5e7eb",
      textAlign: "center",
      color: isDark ? "#94a3b8" : "#64748b",
    },
    header: {
      paddingTop: 20,
      paddingBottom: 10,
      paddingHorizontal: 16,
      backgroundColor: isDark ? "#1e293b" : "#e5e7eb",
      alignItems: "flex-end",
    },
  });

export default getStyles;
