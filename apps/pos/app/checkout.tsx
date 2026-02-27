import { useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { v4 as uuidv4 } from "@lukeed/uuid";
import { useTranslation } from "react-i18next";
import type { PosSalePayment } from "@corely/contracts";
import { getHardwareManager } from "@corely/pos-hardware";
import { useAdaptiveLayout } from "@/hooks/useAdaptiveLayout";
import { formatCurrencyFromCents } from "@/lib/formatters";
import { useSalesService } from "@/hooks/useSalesService";
import { useSyncEngine } from "@/hooks/useSyncEngine";
import { useAuthStore } from "@/stores/authStore";
import { useCartStore } from "@/stores/cartStore";
import { useRegisterStore } from "@/stores/registerStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { useShiftStore } from "@/stores/shiftStore";
import {
  AppShell,
  Badge,
  Button,
  Card,
  CenteredActions,
  MoneyInput,
  NumericKeypad,
  SegmentedControl,
  TextField,
  useMoneyPad,
} from "@/ui/components";
import { posTheme } from "@/ui/theme";
import { styles } from "./checkout.styles";

type PaymentMethod = PosSalePayment["method"];

export default function CheckoutScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { isTablet } = useAdaptiveLayout();
  const { items, customerPartyId, notes, orderDiscountCents, getTotals, clearCart } =
    useCartStore();
  const { currentShift } = useShiftStore();
  const { selectedRegister } = useRegisterStore();
  const { user, apiClient } = useAuthStore();
  const { salesService } = useSalesService();
  const { triggerSync } = useSyncEngine();
  const requireOpenShiftForSales = useSettingsStore((state) => state.requireOpenShiftForSales);
  const totals = getTotals();

  const [payments, setPayments] = useState<PosSalePayment[]>([]);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>("CASH");
  const [paymentReference, setPaymentReference] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSummary, setShowSummary] = useState(isTablet);
  const [cashlessAttempt, setCashlessAttempt] = useState<{
    attemptId: string;
    status: string;
    actionLabel: string;
    amountCents: number;
  } | null>(null);
  const moneyPad = useMoneyPad("");

  const totalPaid = useMemo(
    () => payments.reduce((sum, payment) => sum + payment.amountCents, 0),
    [payments]
  );
  const remaining = totals.totalCents - totalPaid;
  const changeDue = totalPaid > totals.totalCents ? totalPaid - totals.totalCents : 0;

  const methodLabel = (method: PaymentMethod) => t(`checkout.method.${method.toLowerCase()}`);

  const appendPayment = (
    amountCents: number,
    reference?: string | null,
    method: PaymentMethod = selectedMethod
  ) => {
    const payment: PosSalePayment = {
      paymentId: uuidv4(),
      method,
      amountCents,
      reference: reference ?? (paymentReference.trim() || null),
    };

    setPayments((prev) => [...prev, payment]);
    moneyPad.clear();
    setPaymentReference("");
  };

  const addPayment = async (amountCents?: number) => {
    const parsed = amountCents ?? Math.round(Number(moneyPad.value) * 100);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      Alert.alert(t("checkout.invalidAmountTitle"), t("checkout.invalidAmountMessage"));
      return;
    }

    if (
      selectedMethod === "CARD" &&
      apiClient &&
      user &&
      (currentShift?.registerId || selectedRegister?.registerId)
    ) {
      try {
        const registerId = currentShift?.registerId ?? selectedRegister?.registerId;
        if (!registerId) {
          throw new Error("Register is required for cashless payments");
        }

        const started = await apiClient.startCashlessPayment({
          registerId,
          saleId: undefined,
          amountCents: parsed,
          currency: "USD",
          reference: paymentReference.trim() || undefined,
          providerHint: "sumup",
        });

        const actionLabel =
          started.action.type === "redirect_url"
            ? started.action.url
            : started.action.type === "qr_payload"
              ? started.action.payload
              : started.action.type === "terminal_action"
                ? started.action.instruction
                : "";

        setCashlessAttempt({
          attemptId: started.attemptId,
          status: started.status,
          actionLabel,
          amountCents: parsed,
        });

        if (started.status === "paid" || started.status === "authorized") {
          appendPayment(parsed, started.providerRef, "CARD");
        } else {
          Alert.alert(
            t("checkout.cashlessPendingTitle"),
            t("checkout.cashlessPendingMessage", {
              action: actionLabel || t("checkout.cashlessCheckTerminal"),
            })
          );
        }
        return;
      } catch (error) {
        Alert.alert(
          t("checkout.cashlessStartFailedTitle"),
          error instanceof Error ? error.message : t("checkout.cashlessStartFailedMessage")
        );
        return;
      }
    }

    appendPayment(parsed);
  };

  const refreshCashlessStatus = async () => {
    if (!cashlessAttempt || !apiClient) {
      return;
    }

    try {
      const status = await apiClient.getCashlessPaymentStatus(cashlessAttempt.attemptId);
      const actionLabel =
        status.action.type === "redirect_url"
          ? status.action.url
          : status.action.type === "qr_payload"
            ? status.action.payload
            : status.action.type === "terminal_action"
              ? status.action.instruction
              : "";

      setCashlessAttempt({
        attemptId: status.attemptId,
        status: status.status,
        actionLabel,
        amountCents: cashlessAttempt.amountCents,
      });

      if (
        (status.status === "paid" || status.status === "authorized") &&
        !payments.some((payment) => payment.reference === status.providerRef)
      ) {
        appendPayment(cashlessAttempt.amountCents, status.providerRef, "CARD");
      }
    } catch (error) {
      Alert.alert(
        t("checkout.cashlessRefreshFailedTitle"),
        error instanceof Error ? error.message : t("checkout.cashlessRefreshFailedMessage")
      );
    }
  };

  const removePayment = (paymentId: string) => {
    setPayments((prev) => prev.filter((payment) => payment.paymentId !== paymentId));
  };

  const quickCashAdd = (deltaDollars: number) => {
    const target = Math.max(totals.totalCents + deltaDollars * 100, 0);
    void addPayment(target - totalPaid);
  };

  const completeSale = async () => {
    if (!items.length) {
      Alert.alert(t("checkout.cartEmptyTitle"), t("checkout.cartEmptyMessage"));
      return;
    }
    if (remaining > 0) {
      Alert.alert(t("checkout.paymentIncompleteTitle"), t("checkout.paymentIncompleteMessage"));
      return;
    }
    if (requireOpenShiftForSales && !currentShift) {
      Alert.alert(t("checkout.shiftRequiredTitle"), t("checkout.shiftRequiredMessage"));
      return;
    }
    if (!selectedRegister && !currentShift) {
      Alert.alert(t("checkout.registerRequiredTitle"), t("checkout.registerRequiredMessage"));
      return;
    }
    if (!user || !salesService) {
      Alert.alert(t("checkout.notReadyTitle"), t("checkout.notReadyMessage"));
      return;
    }

    setIsProcessing(true);
    try {
      let hardwareArtifact: unknown = null;
      const hardwareManager = getHardwareManager();
      const requireHardware = process.env.EXPO_PUBLIC_POS_REQUIRE_TSE === "true";

      if (requireHardware || process.env.EXPO_PUBLIC_POS_ENABLE_TSE === "true") {
        try {
          const tse = hardwareManager.getTseService();
          await tse.initialize();
          const started = await tse.startTransaction({
            registerId: currentShift?.registerId ?? "unknown",
            amountCents: totals.totalCents,
            saleId: null,
          });
          const completed = await tse.finishTransaction({
            transactionId: started.transactionId,
            totalCents: totals.totalCents,
          });
          hardwareArtifact = completed;
        } catch (error) {
          if (requireHardware) {
            throw new Error(
              error instanceof Error
                ? `Required fiscal hardware failed: ${error.message}`
                : "Required fiscal hardware failed"
            );
          }
          hardwareArtifact = {
            warning: error instanceof Error ? error.message : "Hardware transaction failed",
          };
        }
      }

      const result = await salesService.createSaleAndEnqueue({
        workspaceId: user.workspaceId,
        sessionId: currentShift?.sessionId ?? null,
        registerId:
          currentShift?.registerId ??
          selectedRegister?.registerId ??
          "00000000-0000-0000-0000-000000000000",
        cashierEmployeePartyId: user.userId,
        customerPartyId,
        lineItems: items,
        payments,
        notes,
        cartDiscountCents: orderDiscountCents,
        taxCents: totals.taxCents,
        hardwareArtifact: hardwareArtifact ?? undefined,
      });

      clearCart();
      await triggerSync();
      router.replace(`/receipt?saleId=${result.sale.posSaleId}`);
    } catch (error) {
      Alert.alert(
        t("checkout.completeFailedTitle"),
        error instanceof Error ? error.message : t("checkout.completeFailedMessage")
      );
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <AppShell
      title={t("checkout.title")}
      subtitle={t("checkout.subtitle")}
      onBack={() => router.back()}
      maxWidth={1200}
    >
      <View
        testID="pos-checkout-screen"
        style={[styles.container, isTablet && styles.containerTablet]}
      >
        <ScrollView style={styles.mainPane} contentContainerStyle={styles.scrollBody}>
          {!isTablet ? (
            <Pressable
              style={styles.summaryToggle}
              onPress={() => setShowSummary((value) => !value)}
            >
              <Text style={styles.summaryToggleText}>
                {showSummary ? t("checkout.hideOrderSummary") : t("checkout.showOrderSummary")}
              </Text>
              <Ionicons
                name={showSummary ? "chevron-up" : "chevron-down"}
                size={18}
                color={posTheme.colors.primary}
              />
            </Pressable>
          ) : null}

          {isTablet || showSummary ? (
            <Card>
              <Text style={styles.sectionTitle}>{t("checkout.orderSummary")}</Text>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>{t("checkout.items")}</Text>
                <Text style={styles.summaryValue}>{items.length}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>{t("common.subtotal")}</Text>
                <Text style={styles.summaryValue}>
                  {formatCurrencyFromCents(totals.subtotalCents)}
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>{t("checkout.orderDiscount")}</Text>
                <Text style={styles.summaryValue}>
                  {t("cart.discountAmount", {
                    amount: formatCurrencyFromCents(orderDiscountCents),
                  })}
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>{t("common.tax")}</Text>
                <Text style={styles.summaryValue}>{formatCurrencyFromCents(totals.taxCents)}</Text>
              </View>
              <View style={[styles.summaryRow, styles.summaryGrand]}>
                <Text style={styles.grandLabel}>{t("checkout.totalDue")}</Text>
                <Text style={styles.grandValue}>{formatCurrencyFromCents(totals.totalCents)}</Text>
              </View>
              {customerPartyId ? (
                <Badge
                  label={t("checkout.customer", { id: customerPartyId.slice(0, 8) })}
                  tone="info"
                />
              ) : null}
            </Card>
          ) : null}

          <Card>
            <Text style={styles.sectionTitle}>{t("checkout.payment")}</Text>
            <SegmentedControl
              value={selectedMethod}
              onChange={setSelectedMethod}
              options={(["CASH", "CARD", "BANK_TRANSFER", "OTHER"] as PaymentMethod[]).map(
                (method) => ({
                  value: method,
                  label: methodLabel(method),
                })
              )}
            />

            <View style={styles.paymentState}>
              <View>
                <Text style={styles.stateLabel}>{t("checkout.paid")}</Text>
                <Text style={styles.stateValue}>{formatCurrencyFromCents(totalPaid)}</Text>
              </View>
              <View>
                <Text style={styles.stateLabel}>
                  {remaining > 0 ? t("checkout.remaining") : t("receipt.changeDue")}
                </Text>
                <Text style={[styles.stateValue, remaining <= 0 && styles.changePositive]}>
                  {formatCurrencyFromCents(remaining > 0 ? remaining : changeDue)}
                </Text>
              </View>
            </View>

            <MoneyInput
              testID="pos-checkout-payment-amount"
              label={t("common.amount")}
              value={moneyPad.value}
              onChange={moneyPad.setValue}
              {...(selectedMethod === "CARD" ? { help: t("checkout.cardHelp") } : {})}
            />
            <TextField
              testID="pos-checkout-payment-reference"
              label={t("checkout.referenceOptional")}
              value={paymentReference}
              onChangeText={setPaymentReference}
              placeholder={t("checkout.referencePlaceholder")}
            />
            <CenteredActions style={styles.paymentActions}>
              <Button
                testID="pos-checkout-payment-add"
                label={t("checkout.addPayment")}
                onPress={() => void addPayment()}
              />
              {remaining > 0 ? (
                <Button
                  testID="pos-checkout-add-remaining"
                  label={t("checkout.addRemaining", { amount: formatCurrencyFromCents(remaining) })}
                  variant="secondary"
                  onPress={() => void addPayment(remaining)}
                />
              ) : null}
            </CenteredActions>

            {cashlessAttempt ? (
              <View style={styles.paymentState}>
                <View>
                  <Text style={styles.stateLabel}>{t("checkout.cashlessStatusLabel")}</Text>
                  <Text style={styles.stateValue}>{cashlessAttempt.status.toUpperCase()}</Text>
                </View>
                <Button
                  label={t("checkout.refreshCashlessStatus")}
                  variant="secondary"
                  onPress={() => void refreshCashlessStatus()}
                />
              </View>
            ) : null}

            {selectedMethod === "CASH" ? (
              <View style={styles.cashQuickRow}>
                <Pressable
                  style={styles.quickChip}
                  onPress={() => addPayment(remaining > 0 ? remaining : totals.totalCents)}
                >
                  <Text style={styles.quickChipText}>{t("checkout.exact")}</Text>
                </Pressable>
                <Pressable style={styles.quickChip} onPress={() => quickCashAdd(5)}>
                  <Text style={styles.quickChipText}>+5</Text>
                </Pressable>
                <Pressable style={styles.quickChip} onPress={() => quickCashAdd(10)}>
                  <Text style={styles.quickChipText}>+10</Text>
                </Pressable>
                <Pressable style={styles.quickChip} onPress={() => quickCashAdd(20)}>
                  <Text style={styles.quickChipText}>+20</Text>
                </Pressable>
              </View>
            ) : null}

            <View style={styles.paymentList}>
              {payments.map((payment) => (
                <View key={payment.paymentId} style={styles.paymentRow}>
                  <View style={styles.paymentRowMain}>
                    <Text style={styles.paymentLabel}>{methodLabel(payment.method)}</Text>
                    <Text style={styles.paymentSub}>
                      {payment.reference || t("checkout.noReference")}
                    </Text>
                  </View>
                  <View style={styles.paymentRight}>
                    <Text style={styles.paymentAmount}>
                      {formatCurrencyFromCents(payment.amountCents)}
                    </Text>
                    <Pressable onPress={() => removePayment(payment.paymentId)}>
                      <Ionicons name="close-circle" size={20} color={posTheme.colors.danger} />
                    </Pressable>
                  </View>
                </View>
              ))}
            </View>
          </Card>
        </ScrollView>

        <View style={styles.sidePane}>
          {selectedMethod === "CASH" && isTablet ? (
            <NumericKeypad
              onKey={moneyPad.append}
              onBackspace={moneyPad.backspace}
              onClear={moneyPad.clear}
            />
          ) : null}
        </View>
      </View>

      <View style={styles.footer}>
        <Button
          testID="pos-checkout-complete-sale"
          label={isProcessing ? t("common.processing") : t("checkout.completeSale")}
          onPress={completeSale}
          disabled={isProcessing || remaining > 0}
          loading={isProcessing}
          size="lg"
          fullWidth={!isTablet}
        />
      </View>
    </AppShell>
  );
}
