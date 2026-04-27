import { useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import { v4 as uuidv4 } from "@lukeed/uuid";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useAdaptiveLayout } from "@/hooks/useAdaptiveLayout";
import { usePosBackNavigation } from "@/hooks/usePosBackNavigation";
import { useRestaurantStore } from "@/stores/restaurantStore";
import { AppShell, Button, Card } from "@/ui/components";
import { formatCurrencyFromCents } from "@/lib/formatters";
import { posTheme } from "@/ui/theme";

export default function RestaurantPaymentScreen() {
  const router = useRouter();
  const goBack = usePosBackNavigation("/(main)/restaurant");
  const { isTablet } = useAdaptiveLayout();
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const { activeOrder, closeOrder, sendToKitchen, isMutating } = useRestaurantStore();
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!activeOrder || activeOrder.id !== orderId) {
    return (
      <AppShell title="Payment" subtitle="Restaurant settlement" onBack={goBack}>
        <View style={styles.centered}>
          <Text style={styles.muted}>Load the table order before taking payment.</Text>
        </View>
      </AppShell>
    );
  }

  const hasUnsentItems = activeOrder.items.some(
    (item) => item.sentQuantity === 0 && !item.voidedAt
  );
  const isAlreadyClosed = activeOrder.status === "CLOSED";
  const canCloseOrder = !hasUnsentItems && !isAlreadyClosed;
  const isBusy = isMutating || isSubmitting;

  const closeWithMethod = async (method: "CASH" | "CARD") => {
    if (!canCloseOrder || isBusy) {
      return;
    }
    try {
      setIsSubmitting(true);
      await closeOrder([
        {
          paymentId: uuidv4(),
          method,
          amountCents: activeOrder.totalCents,
          reference: null,
        },
      ]);
      router.replace("/(main)/restaurant" as never);
    } catch (error) {
      setIsSubmitting(false);
      Alert.alert(
        "Unable to close table",
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  };

  const sendItemsToKitchen = async () => {
    if (isBusy) {
      return;
    }
    try {
      setIsSubmitting(true);
      await sendToKitchen();
    } catch (error) {
      Alert.alert("Unable to send items", error instanceof Error ? error.message : "Unknown error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AppShell
      title="Payment / Close"
      subtitle={`Order ${activeOrder.id.slice(0, 8)}`}
      onBack={goBack}
      maxWidth={640}
    >
      <Card>
        <Text style={styles.title}>Settle table</Text>
        <Text style={styles.amount}>{formatCurrencyFromCents(activeOrder.totalCents)}</Text>
        <Text style={styles.muted}>
          {hasUnsentItems
            ? "Send all draft items to kitchen before taking payment."
            : isAlreadyClosed
              ? "This order has already been settled."
              : "Phase 1 keeps settlement simple: exact cash or single card capture placeholder."}
        </Text>
        {hasUnsentItems ? (
          <View style={styles.sendAction}>
            <Button
              label="Send items to kitchen"
              variant="secondary"
              onPress={() => void sendItemsToKitchen()}
              disabled={isBusy}
            />
          </View>
        ) : null}
        <View style={[styles.actions, !isTablet && styles.actionsStacked]}>
          <View style={styles.actionSlot}>
            <Button
              label="Cash"
              onPress={() => void closeWithMethod("CASH")}
              disabled={!canCloseOrder || isBusy}
            />
          </View>
          <View style={styles.actionSlot}>
            <Button
              label="Card"
              variant="secondary"
              onPress={() => void closeWithMethod("CARD")}
              disabled={!canCloseOrder || isBusy}
            />
          </View>
        </View>
      </Card>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: "center",
  },
  title: {
    color: posTheme.colors.text,
    fontSize: 20,
    fontWeight: "700",
    marginBottom: posTheme.spacing.sm,
  },
  amount: {
    color: posTheme.colors.text,
    fontSize: 36,
    fontWeight: "800",
    marginBottom: posTheme.spacing.sm,
  },
  muted: {
    color: posTheme.colors.textMuted,
    marginBottom: posTheme.spacing.md,
  },
  sendAction: {
    marginBottom: posTheme.spacing.sm,
  },
  actions: {
    flexDirection: "row",
    gap: posTheme.spacing.sm,
    flexWrap: "wrap",
  },
  actionsStacked: {
    flexDirection: "column",
  },
  actionSlot: {
    flex: 1,
    minWidth: 220,
  },
});
