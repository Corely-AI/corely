import { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { Button, Card } from "@/ui/components";
import { posTheme } from "@/ui/theme";

export default function KioskSuccessScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { points } = useLocalSearchParams<{ points?: string }>();

  useEffect(() => {
    const timer = setTimeout(() => {
      router.replace("/kiosk");
    }, 6000);
    return () => clearTimeout(timer);
  }, [router]);

  return (
    <View style={styles.container}>
      <Card>
        <View style={styles.cardBody}>
          <Ionicons name="checkmark-circle" size={84} color={posTheme.colors.success} />
          <Text style={styles.title}>{t("kiosk.checkedIn")}</Text>
          <Text style={styles.subtitle}>{t("kiosk.thanks")}</Text>
          <Text style={styles.points}>{t("kiosk.pointsEarned", { points: points ?? "0" })}</Text>
          <Button
            label={t("kiosk.backHomeNow")}
            variant="secondary"
            onPress={() => router.replace("/kiosk")}
          />
        </View>
      </Card>
      <Text style={styles.footer}>{t("kiosk.returning")}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: posTheme.colors.background,
    justifyContent: "center",
    paddingHorizontal: posTheme.spacing.md,
    gap: posTheme.spacing.md,
  },
  cardBody: {
    alignItems: "center",
    gap: posTheme.spacing.xs,
  },
  title: {
    fontSize: 32,
    fontWeight: "900",
    color: posTheme.colors.text,
  },
  subtitle: {
    fontSize: 16,
    color: posTheme.colors.textMuted,
  },
  points: {
    marginTop: posTheme.spacing.sm,
    marginBottom: posTheme.spacing.sm,
    color: posTheme.colors.primary,
    fontSize: 24,
    fontWeight: "900",
  },
  footer: {
    textAlign: "center",
    color: posTheme.colors.textMuted,
  },
});
