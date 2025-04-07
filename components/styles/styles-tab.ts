// styles.ts
import { StyleSheet } from "react-native";

export const getStyles = (isDark: boolean) =>
  StyleSheet.create({
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
    // Add styles for the header and the toggle button
    header: {
      paddingTop: 20,
      paddingBottom: 10,
      paddingHorizontal: 16,
      backgroundColor: isDark ? "#1e293b" : "#e5e7eb",
      alignItems: "flex-end",
    },
    toggleButton: {
      backgroundColor: isDark ? "#4B5563" : "#3498db",
      paddingVertical: 8,
      paddingHorizontal: 20,
      borderRadius: 5,
    },
    toggleButtonText: {
      color: "#fff",
      fontWeight: "bold",
    },
  });
