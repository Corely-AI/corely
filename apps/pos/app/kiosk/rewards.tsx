import { StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { AppShell, EmptyState } from "@/ui/components";
import { posTheme } from "@/ui/theme";

export default function KioskRewardsScreen() {
  const { t } = useTranslation();
  const router = useRouter();

  return (
    <AppShell
      title={t("kiosk.rewards")}
      subtitle={t("kiosk.rewardsSubtitle")}
      onBack={() => router.back()}
      maxWidth={760}
    >
      <View style={styles.container}>
        <EmptyState
          icon={<Ionicons name="gift-outline" size={52} color={posTheme.colors.textMuted} />}
          title={t("kiosk.rewardsEmpty")}
          description={t("kiosk.rewardsEmptyHint")}
          primaryAction={{ label: t("kiosk.backToKiosk"), onPress: () => router.replace("/kiosk") }}
        />
      </View>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
  },
});
