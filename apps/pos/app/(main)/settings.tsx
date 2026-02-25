import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useAuthStore } from "@/stores/authStore";
import { useShiftStore } from "@/stores/shiftStore";
import { useSettingsStore, type LayoutMode, type SupportedLanguage } from "@/stores/settingsStore";
import { useSyncEngine } from "@/hooks/useSyncEngine";
import { formatDateTime } from "@/lib/formatters";
import { Badge, Button, Card, ListRow, SegmentedControl } from "@/ui/components";
import { posTheme } from "@/ui/theme";

const LAYOUT_OPTIONS: LayoutMode[] = ["AUTO", "PHONE", "TABLET"];
const LANGUAGE_OPTIONS: SupportedLanguage[] = ["en", "de", "vi"];

export default function SettingsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const { currentShift } = useShiftStore();
  const {
    layoutMode,
    language,
    setLayoutMode,
    setLanguage,
    requireOpenShiftForSales,
    setRequireOpenShiftForSales,
  } = useSettingsStore();
  const { queueStats, autoSyncEnabled, toggleAutoSync } = useSyncEngine();

  const handleLogout = () => {
    Alert.alert(t("settings.logoutTitle"), t("settings.logoutMessage"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("common.logout"),
        style: "destructive",
        onPress: async () => {
          await logout();
          router.replace("/login" as never);
        },
      },
    ]);
  };

  return (
    <ScrollView
      testID="pos-settings-screen"
      style={styles.container}
      contentContainerStyle={styles.content}
    >
      <Card>
        <View style={styles.accountRow}>
          <Ionicons name="person-circle-outline" size={52} color={posTheme.colors.primary} />
          <View style={styles.accountText}>
            <Text style={styles.accountName}>{user?.email ?? t("settings.unknownUser")}</Text>
            <Text style={styles.accountRole}>{t("settings.posOperator")}</Text>
          </View>
          <Badge
            label={
              user?.workspaceId
                ? t("settings.workspaceBadge", { id: user.workspaceId.slice(0, 6) })
                : t("settings.noWorkspace")
            }
            tone="info"
          />
        </View>
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>{t("settings.registerShiftTitle")}</Text>
        {currentShift ? (
          <>
            <ListRow
              title={t("settings.activeShift")}
              subtitle={t("settings.activeShiftSubtitle", {
                session: currentShift.sessionId.slice(0, 8),
                openedAt: formatDateTime(currentShift.openedAt),
              })}
              right={<Badge label={t("common.open")} tone="success" />}
            />
            <Button
              label={t("settings.closeShift")}
              variant="secondary"
              onPress={() => router.push("/shift/close")}
            />
          </>
        ) : (
          <>
            <ListRow
              title={t("settings.noActiveShift")}
              subtitle={t("settings.noActiveShiftHint")}
            />
            <Button
              label={t("settings.openShift")}
              variant="secondary"
              onPress={() => router.push("/shift/open")}
            />
          </>
        )}
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>{t("settings.layoutModeTitle")}</Text>
        <Text style={styles.sectionHelp}>{t("settings.layoutModeHelp")}</Text>
        <SegmentedControl
          value={layoutMode}
          onChange={(value) => void setLayoutMode(value)}
          options={LAYOUT_OPTIONS.map((option) => ({
            value: option,
            label: t(`settings.layoutMode.${option.toLowerCase()}`),
          }))}
        />
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>{t("settings.languageTitle")}</Text>
        <Text style={styles.sectionHelp}>{t("settings.languageHelp")}</Text>
        <SegmentedControl
          value={language}
          onChange={(value) => void setLanguage(value)}
          options={LANGUAGE_OPTIONS.map((option) => ({
            value: option,
            label: t(`settings.languages.${option}`),
          }))}
        />
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>{t("settings.policiesTitle")}</Text>
        <ToggleRow
          label={t("settings.requireShiftLabel")}
          help={t("settings.requireShiftHelp")}
          enabled={requireOpenShiftForSales}
          onToggle={() => void setRequireOpenShiftForSales(!requireOpenShiftForSales)}
        />
        <ToggleRow
          label={t("settings.autoSyncLabel")}
          help={t("settings.autoSyncHelp")}
          enabled={autoSyncEnabled}
          onToggle={toggleAutoSync}
        />
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>{t("settings.syncSnapshotTitle")}</Text>
        <View style={styles.chips}>
          <Badge
            label={t("settings.syncMetric.pending", { count: queueStats.pending })}
            tone={queueStats.pending > 0 ? "warning" : "neutral"}
          />
          <Badge
            label={t("settings.syncMetric.failed", { count: queueStats.failed })}
            tone={queueStats.failed > 0 ? "danger" : "neutral"}
          />
          <Badge
            label={t("settings.syncMetric.conflicts", { count: queueStats.conflicts })}
            tone={queueStats.conflicts > 0 ? "warning" : "neutral"}
          />
          <Badge
            label={t("settings.syncMetric.synced", { count: queueStats.succeeded })}
            tone="success"
          />
        </View>
        <Button
          label={t("settings.openSyncDashboard")}
          variant="ghost"
          onPress={() => router.push("/(main)/sync")}
        />
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>{t("settings.dangerZoneTitle")}</Text>
        <Button label={t("common.logout")} variant="destructive" onPress={handleLogout} />
      </Card>
    </ScrollView>
  );
}

function ToggleRow({
  label,
  help,
  enabled,
  onToggle,
}: {
  label: string;
  help: string;
  enabled: boolean;
  onToggle: () => void;
}) {
  return (
    <Pressable style={styles.toggleRow} onPress={onToggle}>
      <View style={styles.toggleLabelWrap}>
        <Text style={styles.toggleLabel}>{label}</Text>
        <Text style={styles.toggleHelp}>{help}</Text>
      </View>
      <View style={[styles.toggle, enabled ? styles.toggleOn : styles.toggleOff]}>
        <View style={[styles.toggleKnob, enabled && styles.toggleKnobOn]} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: posTheme.colors.background,
  },
  content: {
    padding: posTheme.spacing.md,
    gap: posTheme.spacing.md,
    paddingBottom: posTheme.spacing.lg,
  },
  accountRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: posTheme.spacing.sm,
  },
  accountText: {
    flex: 1,
  },
  accountName: {
    fontSize: 16,
    fontWeight: "800",
    color: posTheme.colors.text,
  },
  accountRole: {
    marginTop: 2,
    color: posTheme.colors.textMuted,
  },
  sectionTitle: {
    color: posTheme.colors.text,
    fontSize: 16,
    fontWeight: "900",
    marginBottom: posTheme.spacing.sm,
  },
  sectionHelp: {
    color: posTheme.colors.textMuted,
    fontSize: 13,
    marginBottom: posTheme.spacing.sm,
  },
  toggleRow: {
    minHeight: 56,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: posTheme.spacing.sm,
    gap: posTheme.spacing.sm,
  },
  toggleLabelWrap: {
    flex: 1,
  },
  toggleLabel: {
    color: posTheme.colors.text,
    fontWeight: "700",
  },
  toggleHelp: {
    marginTop: 2,
    color: posTheme.colors.textMuted,
    fontSize: 12,
  },
  toggle: {
    width: 50,
    height: 30,
    borderRadius: 15,
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  toggleOn: {
    backgroundColor: "#9FE2C5",
  },
  toggleOff: {
    backgroundColor: "#D7E0DB",
  },
  toggleKnob: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#fff",
  },
  toggleKnobOn: {
    alignSelf: "flex-end",
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: posTheme.spacing.xs,
    marginBottom: posTheme.spacing.sm,
  },
});
