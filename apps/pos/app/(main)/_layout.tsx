import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useAdaptiveLayout } from "@/hooks/useAdaptiveLayout";
import { SyncStatusPill } from "@/ui/components";
import { posTheme } from "@/ui/theme";

export default function MainLayout() {
  const { t } = useTranslation();
  const { isTablet, isWide } = useAdaptiveLayout();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: posTheme.colors.primary,
        tabBarInactiveTintColor: posTheme.colors.textMuted,
        sceneStyle: {
          backgroundColor: posTheme.colors.background,
        },
        tabBarStyle: {
          backgroundColor: posTheme.colors.surface,
          borderTopColor: posTheme.colors.border,
          borderRightColor: posTheme.colors.border,
          minWidth: isTablet ? (isWide ? 132 : 108) : undefined,
        },
        tabBarLabelStyle: {
          fontWeight: "700",
          fontSize: 12,
        },
        tabBarPosition: isTablet ? "left" : "bottom",
        headerShown: true,
        headerStyle: {
          backgroundColor: posTheme.colors.surface,
        },
        headerTitleStyle: {
          color: posTheme.colors.text,
          fontWeight: "700",
        },
        headerShadowVisible: false,
        headerRight: () => <SyncStatusPill />,
        headerRightContainerStyle: {
          paddingRight: posTheme.spacing.md,
        },
        headerLeftContainerStyle: {
          paddingLeft: posTheme.spacing.xs,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t("nav.shop"),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="cash-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="cart"
        options={{
          title: t("nav.cart"),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="cart-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="kiosk"
        options={{
          title: t("nav.kiosk"),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="people-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="sync"
        options={{
          title: t("nav.sync"),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="sync-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: t("nav.settings"),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="settings-outline" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
