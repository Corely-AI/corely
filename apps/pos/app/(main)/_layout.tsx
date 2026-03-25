import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { posTheme } from "@/ui/theme";

const screenOptions = {
  tabBarActiveTintColor: posTheme.colors.primary,
  tabBarInactiveTintColor: posTheme.colors.textMuted,
  tabBarStyle: {
    backgroundColor: posTheme.colors.surface,
    borderTopColor: posTheme.colors.border,
  },
  tabBarLabelStyle: {
    fontWeight: "700" as const,
    fontSize: 12,
  },
  sceneStyle: {
    backgroundColor: posTheme.colors.background,
  },
  headerShown: false,
} as const;

export default function MainLayout() {
  return (
    <Tabs screenOptions={screenOptions}>
      <Tabs.Screen
        name="index"
        options={{
          title: "Sell",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="cash-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="cart"
        options={{
          title: "Cart",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="cart-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="restaurant"
        options={{
          title: "Restaurant",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="restaurant-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="kiosk"
        options={{
          title: "Kiosk",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="people-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="sync"
        options={{
          title: "Sync",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="sync-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="settings-outline" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
