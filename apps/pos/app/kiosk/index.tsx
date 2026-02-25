import { StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useSyncEngine } from "@/hooks/useSyncEngine";
import { Button, Card, CenteredActions } from "@/ui/components";
import { posTheme } from "@/ui/theme";

export default function KioskWelcomeScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { isOnline, queueStats } = useSyncEngine();
  const queueCount = queueStats.pending + queueStats.failed + queueStats.conflicts;

  return (
    <View style={styles.container}>
      <View style={styles.hero}>
        <Text style={styles.brand}>{t("kiosk.brand")}</Text>
        <Text style={styles.subtitle}>{t("kiosk.subtitle")}</Text>
        <View style={styles.statusRow}>
          <View style={[styles.statusDot, { backgroundColor: isOnline ? "#1FA064" : "#D13A3A" }]} />
          <Text style={styles.statusText}>
            {isOnline ? t("status.online") : t("status.offline")} ·{" "}
            {t("kiosk.pendingSync", { count: queueCount })}
          </Text>
        </View>
      </View>

      <View style={styles.actions}>
        <Card>
          <View style={styles.actionBody}>
            <Ionicons name="qr-code-outline" size={28} color="#fff" />
            <View style={styles.actionText}>
              <Text style={styles.actionTitle}>{t("kiosk.checkInQr")}</Text>
              <Text style={styles.actionDesc}>{t("kiosk.qrDescription")}</Text>
            </View>
          </View>
          <CenteredActions maxWidth={360}>
            <Button
              label={t("kiosk.openQrScanner")}
              onPress={() => router.push("/kiosk/scan")}
              size="lg"
            />
          </CenteredActions>
        </Card>

        <Card>
          <CenteredActions maxWidth={360} style={styles.gridActions}>
            <Button
              label={t("kiosk.checkInPhone")}
              variant="secondary"
              onPress={() => router.push("/kiosk/lookup")}
            />
            <Button
              label={t("kiosk.todayCheckIns")}
              variant="secondary"
              onPress={() => router.push("/kiosk/today")}
            />
            <Button
              label={t("kiosk.rewards")}
              variant="ghost"
              onPress={() => router.push("/kiosk/rewards")}
            />
          </CenteredActions>
        </Card>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: posTheme.colors.background,
    padding: posTheme.spacing.md,
    gap: posTheme.spacing.md,
  },
  hero: {
    backgroundColor: posTheme.colors.primary,
    borderRadius: posTheme.radius.xl,
    padding: posTheme.spacing.lg,
  },
  brand: {
    color: "#fff",
    fontSize: 30,
    fontWeight: "900",
  },
  subtitle: {
    marginTop: 6,
    color: "#E8EEFF",
    fontSize: 14,
  },
  statusRow: {
    marginTop: posTheme.spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  statusDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
  },
  statusText: {
    color: "#fff",
    fontWeight: "700",
  },
  actions: {
    flex: 1,
    gap: posTheme.spacing.md,
  },
  actionBody: {
    backgroundColor: posTheme.colors.primary,
    borderRadius: posTheme.radius.lg,
    padding: posTheme.spacing.md,
    marginBottom: posTheme.spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: posTheme.spacing.sm,
  },
  actionText: {
    flex: 1,
  },
  actionTitle: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "900",
  },
  actionDesc: {
    marginTop: 4,
    color: "#DBE6FF",
  },
  gridActions: {
    gap: posTheme.spacing.xs,
  },
});
