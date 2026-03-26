// styles.ts
import { StyleSheet } from "react-native";

export const getStyles = (isDark: boolean) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: "#000000",
    },
    wrapper: {
      flex: 1,
    },
    scrollView: {
      flex: 1,
    },
    contentContainer: {
      flexGrow: 1,
      paddingHorizontal: 20,
      paddingTop: 10,
      paddingBottom: 14,
      gap: 8,
      backgroundColor: "#000000",
    },
    heroCard: {
      borderRadius: 18,
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.14)",
      backgroundColor: "rgba(255,255,255,0.08)",
      padding: 12,
      shadowColor: "#000",
      shadowOpacity: 0.25,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 6 },
      elevation: 4,
    },
    sectionCard: {
      borderRadius: 16,
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.12)",
      backgroundColor: "rgba(255,255,255,0.06)",
      padding: 10,
    },
    title: {
      fontSize: 24,
      fontWeight: "800",
      marginBottom: 6,
      color: "#f3f4f6",
    },
    sectionTitle: {
      fontSize: 14,
      fontWeight: "700",
      marginBottom: 4,
      color: "#f3f4f6",
    },
    paragraph: {
      fontSize: 13,
      lineHeight: 18,
      color: "#d1d5db",
    },
    footer: {
      fontSize: 12,
      marginTop: "auto",
      paddingTop: 8,
      textAlign: "center",
      color: "#9ca3af",
    },
  });
