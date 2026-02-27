import { useMemo, useState } from "react";
import { Alert, FlatList, RefreshControl, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useSyncEngine } from "@/hooks/useSyncEngine";
import { formatDateTime } from "@/lib/formatters";
import { posTheme } from "@/ui/theme";
import {
  Badge,
  Button,
  Card,
  CenteredActions,
  EmptyState,
  ListRow,
  ModalSheet,
  SegmentedControl,
} from "@/ui/components";
import type { OutboxCommand } from "@corely/offline-core";

type FilterKey = "ALL" | "PENDING" | "FAILED" | "CONFLICT" | "SUCCEEDED";

export default function SyncScreen() {
  const { t } = useTranslation();
  const {
    commands,
    syncStatus,
    queueStats,
    triggerSync,
    retryFailedCommand,
    retryFailedCommands,
    dropCommand,
    exportLogsToClipboard,
    lastSyncAt,
  } = useSyncEngine();

  const [filter, setFilter] = useState<FilterKey>("ALL");
  const [selectedCommand, setSelectedCommand] = useState<OutboxCommand | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const filtered = useMemo(() => {
    if (filter === "ALL") {
      return commands;
    }
    return commands.filter((command) => command.status === filter);
  }, [commands, filter]);

  const filterCounts = useMemo(
    () => ({
      ALL: commands.length,
      PENDING: commands.filter(
        (command) => command.status === "PENDING" || command.status === "IN_FLIGHT"
      ).length,
      FAILED: commands.filter((command) => command.status === "FAILED").length,
      CONFLICT: commands.filter((command) => command.status === "CONFLICT").length,
      SUCCEEDED: commands.filter((command) => command.status === "SUCCEEDED").length,
    }),
    [commands]
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await triggerSync();
    setRefreshing(false);
  };

  const exportLogs = async () => {
    const len = await exportLogsToClipboard();
    Alert.alert(t("sync.logsCopiedTitle"), t("sync.logsCopiedMessage", { count: len }));
  };

  return (
    <View testID="pos-sync-screen" style={styles.container}>
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.commandId}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListHeaderComponent={
          <View style={styles.headerBlock}>
            <Card>
              <View style={styles.syncHeader}>
                <View style={styles.syncHeaderText}>
                  <Text testID="pos-sync-title" style={styles.title}>
                    {t("sync.dashboardTitle")}
                  </Text>
                  <Text style={styles.meta}>{t("sync.statusLabel", { status: syncStatus })}</Text>
                  <Text style={styles.meta}>
                    {lastSyncAt
                      ? t("sync.lastSyncAt", { time: formatDateTime(lastSyncAt) })
                      : t("sync.lastSyncNever")}
                  </Text>
                </View>
                <StatusBadge status={syncStatus === "syncing" ? "IN_FLIGHT" : "SUCCEEDED"} />
              </View>

              <View style={styles.metricsRow}>
                <Metric
                  testKey="pending"
                  label={t("sync.pending")}
                  value={queueStats.pending + queueStats.inFlight}
                  onPress={() => setFilter("PENDING")}
                />
                <Metric
                  testKey="failed"
                  label={t("sync.failed")}
                  value={queueStats.failed}
                  onPress={() => setFilter("FAILED")}
                />
                <Metric
                  testKey="conflicts"
                  label={t("sync.conflicts")}
                  value={queueStats.conflicts}
                  onPress={() => setFilter("CONFLICT")}
                />
                <Metric
                  testKey="synced"
                  label={t("sync.synced")}
                  value={queueStats.succeeded}
                  onPress={() => setFilter("SUCCEEDED")}
                />
              </View>

              <CenteredActions style={styles.actions}>
                <Button
                  testID="pos-sync-sync-now"
                  label={t("sync.syncNow")}
                  onPress={() => void triggerSync()}
                />
                <Button
                  testID="pos-sync-retry-failed"
                  label={t("sync.retryFailed")}
                  variant="secondary"
                  onPress={() => void retryFailedCommands()}
                />
                <Button
                  testID="pos-sync-export-logs"
                  label={t("sync.exportLogs")}
                  variant="secondary"
                  onPress={() => void exportLogs()}
                />
              </CenteredActions>
            </Card>

            <SegmentedControl
              value={filter}
              onChange={setFilter}
              options={[
                { value: "ALL", label: t("common.all"), count: filterCounts.ALL },
                { value: "PENDING", label: t("sync.pending"), count: filterCounts.PENDING },
                { value: "FAILED", label: t("sync.failed"), count: filterCounts.FAILED },
                { value: "CONFLICT", label: t("sync.conflict"), count: filterCounts.CONFLICT },
                { value: "SUCCEEDED", label: t("sync.succeeded"), count: filterCounts.SUCCEEDED },
              ]}
            />
          </View>
        }
        renderItem={({ item }) => (
          <Card padded={false}>
            <ListRow
              title={item.type}
              subtitle={t("sync.commandSubtitle", {
                date: formatDateTime(item.createdAt),
                attempts: item.attempts,
              })}
              right={<StatusBadge status={item.status} />}
              showChevron
              onPress={() => setSelectedCommand(item)}
            />
          </Card>
        )}
        ListEmptyComponent={
          <EmptyState
            icon={
              <Ionicons name="checkmark-circle-outline" size={50} color={posTheme.colors.success} />
            }
            title={t("sync.outboxClearTitle")}
            description={
              lastSyncAt
                ? t("sync.outboxClearDescription", { time: formatDateTime(lastSyncAt) })
                : t("sync.noCommandsForFilter")
            }
          />
        }
      />

      <ModalSheet
        visible={Boolean(selectedCommand)}
        title={selectedCommand ? selectedCommand.type : t("sync.commandDetails")}
        onClose={() => setSelectedCommand(null)}
      >
        {selectedCommand ? (
          <View style={styles.details}>
            <Text style={styles.detailLabel}>{t("common.status")}</Text>
            <StatusBadge status={selectedCommand.status} />
            <Text style={styles.detailBlock}>
              {t("sync.idempotencyKey", { key: selectedCommand.idempotencyKey })}
            </Text>
            <Text style={styles.detailBlock}>
              {t("sync.payload")}
              {"\n"}
              {JSON.stringify(selectedCommand.payload, null, 2)}
            </Text>
            {selectedCommand.error ? (
              <Text style={styles.errorText}>
                {t("common.error")}:{"\n"}
                {typeof selectedCommand.error.meta === "string"
                  ? selectedCommand.error.meta
                  : selectedCommand.error.message}
              </Text>
            ) : null}
            <CenteredActions maxWidth={360} style={styles.detailActions}>
              {selectedCommand.status === "FAILED" || selectedCommand.status === "CONFLICT" ? (
                <Button
                  label={t("sync.retry")}
                  variant="secondary"
                  onPress={() => {
                    void retryFailedCommand(selectedCommand.commandId);
                    setSelectedCommand(null);
                  }}
                />
              ) : null}
              <Button
                label={t("sync.dropCommand")}
                variant="destructive"
                onPress={() => {
                  Alert.alert(t("sync.dropCommandTitle"), t("sync.dropCommandMessage"), [
                    { text: t("common.cancel"), style: "cancel" },
                    {
                      text: t("common.drop"),
                      style: "destructive",
                      onPress: () => {
                        void dropCommand(selectedCommand.commandId);
                        setSelectedCommand(null);
                      },
                    },
                  ]);
                }}
              />
            </CenteredActions>
          </View>
        ) : null}
      </ModalSheet>
    </View>
  );
}

function Metric({
  testKey,
  label,
  value,
  onPress,
}: {
  testKey: string;
  label: string;
  value: number;
  onPress: () => void;
}) {
  const { t } = useTranslation();
  const statKey = `pos-sync-stat-${testKey}`;
  return (
    <Card padded={false}>
      <View testID={statKey} style={styles.metricCell}>
        <Text style={styles.metricValue}>{value}</Text>
        <Text style={styles.metricLabel}>{label}</Text>
        <Button
          label={t("common.view")}
          variant="ghost"
          onPress={onPress}
          align="stretch"
          labelLines={1}
        />
      </View>
    </Card>
  );
}

function StatusBadge({ status }: { status: OutboxCommand["status"] }) {
  const tone =
    status === "SUCCEEDED"
      ? "success"
      : status === "FAILED"
        ? "danger"
        : status === "CONFLICT"
          ? "warning"
          : status === "IN_FLIGHT"
            ? "info"
            : "neutral";

  return <Badge label={status} tone={tone} />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: posTheme.colors.background,
  },
  content: {
    padding: posTheme.spacing.md,
    gap: posTheme.spacing.md,
    paddingBottom: 80,
  },
  headerBlock: {
    gap: posTheme.spacing.md,
  },
  syncHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: posTheme.spacing.sm,
  },
  syncHeaderText: {
    flex: 1,
  },
  title: {
    color: posTheme.colors.text,
    fontSize: 22,
    fontWeight: "900",
  },
  meta: {
    marginTop: 4,
    color: posTheme.colors.textMuted,
  },
  metricsRow: {
    marginTop: posTheme.spacing.sm,
    gap: posTheme.spacing.xs,
  },
  metricCell: {
    padding: posTheme.spacing.sm,
    alignItems: "center",
    gap: 2,
  },
  metricValue: {
    color: posTheme.colors.primary,
    fontSize: 24,
    fontWeight: "900",
  },
  metricLabel: {
    color: posTheme.colors.textMuted,
    fontSize: 12,
    marginBottom: 6,
  },
  actions: {
    marginTop: posTheme.spacing.sm,
    gap: posTheme.spacing.xs,
  },
  details: {
    gap: posTheme.spacing.sm,
  },
  detailLabel: {
    color: posTheme.colors.textMuted,
    fontSize: 12,
    textTransform: "uppercase",
    fontWeight: "700",
  },
  detailBlock: {
    color: posTheme.colors.text,
    borderWidth: 1,
    borderColor: posTheme.colors.border,
    borderRadius: posTheme.radius.md,
    padding: posTheme.spacing.sm,
    backgroundColor: posTheme.colors.surfaceMuted,
    fontSize: 12,
  },
  errorText: {
    color: posTheme.colors.danger,
    fontSize: 12,
  },
  detailActions: {
    gap: posTheme.spacing.xs,
  },
});
