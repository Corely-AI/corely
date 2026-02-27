import { Pressable, StyleSheet, Text } from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useSyncEngine } from "@/hooks/useSyncEngine";
import { posTheme } from "@/ui/theme";

export function SyncStatusPill() {
  const { t } = useTranslation();
  const router = useRouter();
  const { isOnline, syncStatus, queueStats } = useSyncEngine();

  const queueCount = queueStats.pending + queueStats.failed + queueStats.conflicts;
  const isAttention = !isOnline || queueStats.failed > 0 || queueStats.conflicts > 0;
  const label = !isOnline
    ? t("status.offline")
    : syncStatus === "syncing"
      ? t("status.syncing")
      : isAttention
        ? t("status.attention")
        : t("status.online");

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Open sync dashboard"
      style={[
        styles.syncPill,
        !isOnline
          ? styles.syncPillOffline
          : syncStatus === "syncing"
            ? styles.syncPillSyncing
            : isAttention
              ? styles.syncPillAttention
              : styles.syncPillOnline,
      ]}
      onPress={() => router.push("/(main)/sync")}
    >
      <Text style={styles.syncPillText}>{label}</Text>
      {queueCount > 0 ? (
        <Text style={styles.syncPillQueue}> • {t("status.queue", { count: queueCount })}</Text>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  syncPill: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: posTheme.radius.pill,
    borderWidth: 1,
    paddingHorizontal: 11,
    paddingVertical: 6,
  },
  syncPillText: {
    fontSize: 12,
    fontWeight: "800",
    color: posTheme.colors.text,
  },
  syncPillQueue: {
    fontSize: 12,
    fontWeight: "700",
    color: posTheme.colors.textMuted,
  },
  syncPillOnline: {
    backgroundColor: posTheme.colors.syncOnlineBg,
    borderColor: posTheme.colors.syncOnlineBorder,
  },
  syncPillSyncing: {
    backgroundColor: posTheme.colors.syncSyncingBg,
    borderColor: posTheme.colors.syncSyncingBorder,
  },
  syncPillAttention: {
    backgroundColor: posTheme.colors.syncAttentionBg,
    borderColor: posTheme.colors.syncAttentionBorder,
  },
  syncPillOffline: {
    backgroundColor: posTheme.colors.syncOfflineBg,
    borderColor: posTheme.colors.syncOfflineBorder,
  },
});
