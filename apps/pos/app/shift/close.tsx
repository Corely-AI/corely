import { useMemo, useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useShiftStore } from "@/stores/shiftStore";
import { useAdaptiveLayout } from "@/hooks/useAdaptiveLayout";
import { formatCurrencyFromCents, formatDateTime, formatTime } from "@/lib/formatters";
import {
  AppShell,
  Button,
  Card,
  CenteredActions,
  EmptyState,
  ListRow,
  MoneyInput,
  NumericKeypad,
  TextField,
  useMoneyPad,
} from "@/ui/components";
import { posTheme } from "@/ui/theme";

export default function CloseShiftScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { isTablet } = useAdaptiveLayout();
  const { currentShift, cashEvents, closeShift, addCashEvent, isLoading } = useShiftStore();
  const [cashEventAmount, setCashEventAmount] = useState("");
  const [cashEventReason, setCashEventReason] = useState("");
  const pad = useMoneyPad("");

  if (!currentShift) {
    return (
      <AppShell
        title={t("shift.closeTitle")}
        subtitle={t("settings.noActiveShift")}
        onBack={() => router.back()}
        maxWidth={760}
      >
        <View style={styles.empty}>
          <EmptyState
            icon={
              <Ionicons name="alert-circle-outline" size={44} color={posTheme.colors.textMuted} />
            }
            title={t("settings.noActiveShift")}
            description={t("shift.noActiveDescription")}
            primaryAction={{ label: t("common.back"), onPress: () => router.back() }}
          />
        </View>
      </AppShell>
    );
  }

  const paidInCents = cashEvents
    .filter((event) => event.eventType === "PAID_IN")
    .reduce((sum, event) => sum + event.amountCents, 0);
  const paidOutCents = cashEvents
    .filter((event) => event.eventType === "PAID_OUT")
    .reduce((sum, event) => sum + event.amountCents, 0);

  const expectedCashCents =
    (currentShift.startingCashCents ?? 0) +
    currentShift.totalCashReceivedCents +
    paidInCents -
    paidOutCents;
  const closingCashCents = pad.value ? Math.round(Number(pad.value) * 100) : null;
  const varianceCents = closingCashCents === null ? null : closingCashCents - expectedCashCents;
  const largeVariance = varianceCents !== null && Math.abs(varianceCents) > 5000;

  const sortedEvents = useMemo(
    () => [...cashEvents].sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime()),
    [cashEvents]
  );

  const addCashEventHandler = async (eventType: "PAID_IN" | "PAID_OUT") => {
    const amount = Math.round(Number(cashEventAmount) * 100);
    if (!Number.isFinite(amount) || amount <= 0) {
      Alert.alert(t("shift.invalidAmountTitle"), t("shift.invalidAmountMessage"));
      return;
    }
    try {
      await addCashEvent({
        eventType,
        amountCents: amount,
        reason: cashEventReason.trim() || null,
      });
      setCashEventAmount("");
      setCashEventReason("");
    } catch (error) {
      Alert.alert(
        t("shift.cashEventFailedTitle"),
        error instanceof Error ? error.message : t("shift.cashEventFailedMessage")
      );
    }
  };

  const closeShiftHandler = async () => {
    if (pad.value && (!Number.isFinite(Number(pad.value)) || Number(pad.value) < 0)) {
      Alert.alert(t("shift.invalidAmountTitle"), t("shift.closeInvalidAmountMessage"));
      return;
    }

    const confirmMessage = largeVariance
      ? t("shift.largeVarianceConfirm")
      : t("shift.closeConfirmMessage");
    Alert.alert(t("shift.closeTitle"), confirmMessage, [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("shift.closeShift"),
        style: "destructive",
        onPress: async () => {
          try {
            const payload: { closingCashCents: number | null; notes?: string } = {
              closingCashCents,
            };
            if (cashEventReason.trim()) {
              payload.notes = cashEventReason.trim();
            }
            await closeShift(payload);
            router.replace("/(main)/settings");
          } catch (error) {
            Alert.alert(
              t("shift.closeFailedTitle"),
              error instanceof Error ? error.message : t("shift.closeFailedMessage")
            );
          }
        },
      },
    ]);
  };

  return (
    <AppShell
      title={t("shift.closeTitle")}
      subtitle={t("shift.closeSubtitle")}
      onBack={() => router.back()}
      maxWidth={1120}
    >
      <View
        testID="pos-shift-close-screen"
        style={[styles.layout, isTablet && styles.layoutTablet]}
      >
        <ScrollView style={styles.mainPane} contentContainerStyle={styles.scrollBody}>
          <Card>
            <Text style={styles.sectionTitle}>{t("shift.summary")}</Text>
            <Row label={t("shift.startedAt")} value={formatDateTime(currentShift.openedAt)} />
            <Row
              label={t("shift.openingCash")}
              value={formatCurrencyFromCents(currentShift.startingCashCents ?? 0)}
            />
            <Row
              label={t("shift.totalSales")}
              value={formatCurrencyFromCents(currentShift.totalSalesCents)}
            />
            <Row
              label={t("shift.cashReceived")}
              value={formatCurrencyFromCents(currentShift.totalCashReceivedCents)}
            />
            <Row label={t("shift.paidIn")} value={formatCurrencyFromCents(paidInCents)} />
            <Row label={t("shift.paidOut")} value={formatCurrencyFromCents(paidOutCents)} />
            <Row
              label={t("shift.expectedCash")}
              value={formatCurrencyFromCents(expectedCashCents)}
              emphasize
            />
          </Card>

          <Card>
            <Text style={styles.sectionTitle}>{t("shift.paidInOutSection")}</Text>
            <MoneyInput
              label={t("common.amount")}
              value={cashEventAmount}
              onChange={setCashEventAmount}
              help={t("shift.cashEventHelp")}
            />
            <TextField
              label={t("common.notesOptional")}
              value={cashEventReason}
              onChangeText={setCashEventReason}
            />
            <CenteredActions style={styles.actionsRow}>
              <Button
                label={t("shift.paidIn")}
                variant="secondary"
                onPress={() => addCashEventHandler("PAID_IN")}
              />
              <Button
                label={t("shift.paidOut")}
                variant="secondary"
                onPress={() => addCashEventHandler("PAID_OUT")}
              />
            </CenteredActions>
          </Card>

          <Card>
            <Text style={styles.sectionTitle}>{t("shift.cashCount")}</Text>
            <MoneyInput
              value={pad.value}
              onChange={pad.setValue}
              label={t("shift.countedCash")}
              testID="pos-shift-close-counted-cash"
            />
            {varianceCents !== null ? (
              <Row
                label={t("shift.variance")}
                value={`${varianceCents >= 0 ? "+" : "-"}${formatCurrencyFromCents(Math.abs(varianceCents))}`}
                emphasize
                tone={varianceCents === 0 ? "neutral" : varianceCents > 0 ? "positive" : "negative"}
              />
            ) : null}
            {largeVariance ? (
              <Text style={styles.warningText}>{t("shift.largeVarianceWarning")}</Text>
            ) : null}
            <Button
              label={isLoading ? t("shift.closing") : t("shift.closeShift")}
              onPress={closeShiftHandler}
              disabled={isLoading}
              variant="destructive"
              loading={isLoading}
            />
          </Card>
        </ScrollView>

        <View style={styles.rightPane}>
          {isTablet ? (
            <NumericKeypad onKey={pad.append} onBackspace={pad.backspace} onClear={pad.clear} />
          ) : null}
          <Card>
            <Text style={styles.sectionTitle}>{t("shift.recentCashEvents")}</Text>
            {sortedEvents.length ? (
              sortedEvents
                .slice(0, 8)
                .map((event) => (
                  <ListRow
                    key={event.eventId}
                    title={
                      t(`shift.${event.eventType === "PAID_IN" ? "paidIn" : "paidOut"}`) +
                      ` · ${formatCurrencyFromCents(event.amountCents)}`
                    }
                    subtitle={`${event.reason || t("shift.noReason")} · ${formatTime(event.occurredAt)}`}
                    right={<Text style={styles.eventState}>{event.syncStatus}</Text>}
                  />
                ))
            ) : (
              <Text style={styles.emptyEvents}>{t("shift.noCashEvents")}</Text>
            )}
          </Card>
        </View>
      </View>
    </AppShell>
  );
}

function Row({
  label,
  value,
  emphasize = false,
  tone = "neutral",
}: {
  label: string;
  value: string;
  emphasize?: boolean;
  tone?: "neutral" | "positive" | "negative";
}) {
  return (
    <View style={styles.row}>
      <Text style={[styles.rowLabel, emphasize && styles.rowLabelStrong]}>{label}</Text>
      <Text
        style={[
          styles.rowValue,
          emphasize && styles.rowValueStrong,
          tone === "positive" && { color: posTheme.colors.success },
          tone === "negative" && { color: posTheme.colors.danger },
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  layout: {
    flex: 1,
    gap: posTheme.spacing.md,
  },
  layoutTablet: {
    flexDirection: "row",
    alignItems: "stretch",
  },
  scrollBody: {
    gap: posTheme.spacing.md,
    paddingBottom: posTheme.spacing.lg,
  },
  rightPane: {
    flex: 1,
    gap: posTheme.spacing.md,
  },
  mainPane: {
    flex: 1.35,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: posTheme.colors.text,
    marginBottom: posTheme.spacing.sm,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  rowLabel: {
    color: posTheme.colors.textMuted,
    fontSize: 14,
  },
  rowValue: {
    color: posTheme.colors.text,
    fontWeight: "700",
  },
  rowLabelStrong: {
    color: posTheme.colors.text,
    fontWeight: "700",
  },
  rowValueStrong: {
    fontSize: 16,
  },
  actionsRow: {
    marginTop: posTheme.spacing.xs,
  },
  warningText: {
    color: posTheme.colors.warning,
    marginBottom: posTheme.spacing.sm,
    fontWeight: "600",
  },
  eventState: {
    color: posTheme.colors.textMuted,
    fontSize: 12,
    fontWeight: "700",
  },
  emptyEvents: {
    color: posTheme.colors.textMuted,
    marginTop: posTheme.spacing.sm,
  },
  empty: {
    flex: 1,
    justifyContent: "center",
  },
});
