import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router/js-tabs";
import React from "react";
import type { ColorValue } from "react-native";

import { AdaptiveTabBar } from "../../components/navigation/AdaptiveTabBar";
import { colors } from "../../constants/theme";
import { useLayout } from "../../hooks/useLayout";

type IconName = React.ComponentProps<typeof Ionicons>["name"];
type IconProps = { color: ColorValue; focused: boolean };

function icon(active: IconName, inactive: IconName) {
  return function TabIcon({ color, focused }: IconProps) {
    return <Ionicons name={focused ? active : inactive} size={22} color={color as string} />;
  };
}

export default function TabLayout() {
  const { useRail } = useLayout();

  return (
    <Tabs
      tabBar={(props) => <AdaptiveTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        tabBarPosition: useRail ? "left" : "bottom",
        animation: "fade",
        sceneStyle: { backgroundColor: colors.bg },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: "Scan", tabBarIcon: icon("scan-circle", "scan-circle-outline") }}
      />
      <Tabs.Screen
        name="stats"
        options={{ title: "Stats", tabBarIcon: icon("stats-chart", "stats-chart-outline") }}
      />
      <Tabs.Screen
        name="leaderboard"
        options={{
          title: "Leaderboard",
          tabBarLabel: "Ranks",
          tabBarIcon: icon("trophy", "trophy-outline"),
        }}
      />
      <Tabs.Screen
        name="community"
        options={{
          title: "Community",
          tabBarLabel: "Vote",
          tabBarIcon: icon("earth", "earth-outline"),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: "Profile", tabBarIcon: icon("person-circle", "person-circle-outline") }}
      />
      <Tabs.Screen
        name="settings"
        options={{ title: "Settings", tabBarIcon: icon("settings", "settings-outline") }}
      />
    </Tabs>
  );
}
