import { Alert, StyleSheet, Text, View } from "react-native";
import { v4 as uuidv4 } from "@lukeed/uuid";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useRestaurantStore } from "@/stores/restaurantStore";
import { AppShell, Button, Card } from "@/ui/components";
import { formatCurrencyFromCents } from "@/lib/formatters";
import { posTheme } from "@/ui/theme";

export default function RestaurantPaymentScreen() {
  const router = useRouter();
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const { activeOrder, closeOrder, isMutating } = useRestaurantStore();

  if (!activeOrder || activeOrder.id !== orderId) {
    return (
      <AppShell title="Payment" subtitle="Restaurant settlement" onBack={() => router.back()}>
        <View style={styles.centered}>
          <Text style={styles.muted}>Load the table order before taking payment.</Text>
        </View>
      </AppShell>
    );
  }

  const closeWithMethod = async (method: "CASH" | "CARD") => {
    try {
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
      Alert.alert(
        "Unable to close table",
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  };

  return (
    <AppShell
      title="Payment / Close"
      subtitle={`Order ${activeOrder.id.slice(0, 8)}`}
      onBack={() => router.back()}
      maxWidth={640}
    >
      <Card>
        <Text style={styles.title}>Settle table</Text>
        <Text style={styles.amount}>{formatCurrencyFromCents(activeOrder.totalCents)}</Text>
        <Text style={styles.muted}>
          Phase 1 keeps settlement simple: exact cash or single card capture placeholder.
        </Text>
        <View style={styles.actions}>
          <Button label="Cash" onPress={() => void closeWithMethod("CASH")} disabled={isMutating} />
          <Button
            label="Card"
            variant="secondary"
            onPress={() => void closeWithMethod("CARD")}
            disabled={isMutating}
          />
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
  actions: {
    flexDirection: "row",
    gap: posTheme.spacing.sm,
  },
});
