import { Alert, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useAdaptiveLayout } from "@/hooks/useAdaptiveLayout";
import { formatCurrencyFromCents } from "@/lib/formatters";
import { useCartStore } from "@/stores/cartStore";
import { Button, Card, EmptyState } from "@/ui/components";
import { posTheme } from "@/ui/theme";

export default function CartScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { isTablet } = useAdaptiveLayout();
  const {
    items,
    updateQuantity,
    updateLineDiscount,
    removeItem,
    clearCart,
    getTotals,
    orderDiscountCents,
    setOrderDiscount,
  } = useCartStore();

  const totals = getTotals();

  const applyDiscountPreset = (lineItemId: string) => {
    Alert.alert(t("cart.lineDiscountTitle"), t("cart.chooseDiscount"), [
      { text: t("common.cancel"), style: "cancel" },
      { text: "$1.00", onPress: () => updateLineDiscount(lineItemId, 100) },
      { text: "$2.50", onPress: () => updateLineDiscount(lineItemId, 250) },
      { text: "$5.00", onPress: () => updateLineDiscount(lineItemId, 500) },
      { text: t("common.remove"), onPress: () => updateLineDiscount(lineItemId, 0) },
    ]);
  };

  const applyOrderDiscountPreset = () => {
    Alert.alert(t("cart.orderDiscountTitle"), t("cart.chooseOrderDiscount"), [
      { text: t("common.cancel"), style: "cancel" },
      { text: "$2.00", onPress: () => setOrderDiscount(200) },
      { text: "$5.00", onPress: () => setOrderDiscount(500) },
      { text: "$10.00", onPress: () => setOrderDiscount(1000) },
      { text: t("common.remove"), onPress: () => setOrderDiscount(0) },
    ]);
  };

  if (!items.length) {
    return (
      <View testID="pos-cart-empty" style={styles.emptyWrap}>
        <EmptyState
          icon={<Ionicons name="cart-outline" size={52} color={posTheme.colors.textMuted} />}
          title={t("cart.emptyTitle")}
          description={t("cart.emptyDescription")}
          primaryAction={{ label: t("cart.scanItem"), onPress: () => router.push("/scanner") }}
          secondaryAction={{
            label: t("cart.browseProducts"),
            onPress: () => router.push("/(main)"),
          }}
        />
      </View>
    );
  }

  return (
    <View testID="pos-cart-screen" style={[styles.container, isTablet && styles.containerTablet]}>
      <View style={styles.itemsPane}>
        <FlatList
          data={items}
          keyExtractor={(item) => item.lineItemId}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <Card>
              <View style={styles.rowHeader}>
                <View style={styles.rowMain}>
                  <Text style={styles.itemName}>{item.productName}</Text>
                  <Text style={styles.itemMeta}>{item.sku}</Text>
                </View>
                <Text style={styles.itemTotal}>{formatCurrencyFromCents(item.lineTotalCents)}</Text>
              </View>

              <View style={styles.controlsRow}>
                <View style={styles.qtyControls}>
                  <Pressable
                    style={styles.qtyButton}
                    onPress={() => updateQuantity(item.lineItemId, Math.max(1, item.quantity - 1))}
                  >
                    <Ionicons name="remove" size={16} color={posTheme.colors.text} />
                  </Pressable>
                  <Text style={styles.qtyLabel}>{item.quantity}</Text>
                  <Pressable
                    style={styles.qtyButton}
                    onPress={() => updateQuantity(item.lineItemId, item.quantity + 1)}
                  >
                    <Ionicons name="add" size={16} color={posTheme.colors.text} />
                  </Pressable>
                </View>

                <View style={styles.actionsInline}>
                  <Pressable
                    style={styles.actionChip}
                    onPress={() => applyDiscountPreset(item.lineItemId)}
                  >
                    <Ionicons name="pricetag-outline" size={14} color={posTheme.colors.primary} />
                    <Text style={styles.actionChipText}>
                      {item.discountCents
                        ? t("cart.discountAmount", {
                            amount: formatCurrencyFromCents(item.discountCents),
                          })
                        : t("cart.discount")}
                    </Text>
                  </Pressable>
                  <Pressable style={styles.deleteChip} onPress={() => removeItem(item.lineItemId)}>
                    <Ionicons name="trash-outline" size={14} color={posTheme.colors.danger} />
                  </Pressable>
                </View>
              </View>
            </Card>
          )}
        />
      </View>

      <View style={styles.summaryPane}>
        <Card>
          <Text style={styles.summaryTitle}>{t("cart.summary")}</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>{t("common.subtotal")}</Text>
            <Text style={styles.summaryValue}>{formatCurrencyFromCents(totals.subtotalCents)}</Text>
          </View>
          <Pressable style={styles.summaryRow} onPress={applyOrderDiscountPreset}>
            <Text style={styles.summaryLabel}>{t("cart.orderDiscount")}</Text>
            <Text style={styles.summaryValue}>
              {orderDiscountCents
                ? t("cart.discountAmount", { amount: formatCurrencyFromCents(orderDiscountCents) })
                : t("cart.tapToAdd")}
            </Text>
          </Pressable>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>{t("common.tax")}</Text>
            <Text style={styles.summaryValue}>{formatCurrencyFromCents(totals.taxCents)}</Text>
          </View>
          <View style={[styles.summaryRow, styles.summaryGrand]}>
            <Text style={styles.grandLabel}>{t("common.total")}</Text>
            <Text style={styles.grandValue}>{formatCurrencyFromCents(totals.totalCents)}</Text>
          </View>
          <View style={styles.summaryActions}>
            <Button
              label={t("cart.clear")}
              variant="secondary"
              onPress={clearCart}
              testID="pos-cart-clear"
            />
            <Button
              label={t("cart.checkout")}
              onPress={() => router.push("/checkout")}
              testID="pos-cart-checkout"
            />
          </View>
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
  containerTablet: {
    flexDirection: "row",
    alignItems: "stretch",
  },
  itemsPane: {
    flex: 1.4,
  },
  summaryPane: {
    flex: 1,
    maxWidth: 460,
  },
  listContent: {
    gap: posTheme.spacing.sm,
    paddingBottom: posTheme.spacing.md,
  },
  rowHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  rowMain: {
    flex: 1,
  },
  itemName: {
    color: posTheme.colors.text,
    fontSize: 16,
    fontWeight: "700",
  },
  itemMeta: {
    marginTop: 2,
    color: posTheme.colors.textMuted,
    fontSize: 13,
  },
  itemTotal: {
    color: posTheme.colors.text,
    fontSize: 18,
    fontWeight: "800",
  },
  controlsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: posTheme.spacing.sm,
  },
  qtyControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  qtyButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: posTheme.colors.surfaceMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  qtyLabel: {
    minWidth: 24,
    textAlign: "center",
    fontWeight: "700",
    color: posTheme.colors.text,
  },
  actionsInline: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  actionChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: posTheme.radius.pill,
    backgroundColor: posTheme.colors.primaryMuted,
  },
  actionChipText: {
    color: posTheme.colors.primary,
    fontWeight: "700",
    fontSize: 12,
  },
  deleteChip: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: posTheme.colors.cartDeleteSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  summaryTitle: {
    fontSize: 20,
    color: posTheme.colors.text,
    fontWeight: "900",
    marginBottom: posTheme.spacing.sm,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  summaryLabel: {
    color: posTheme.colors.textMuted,
  },
  summaryValue: {
    color: posTheme.colors.text,
    fontWeight: "700",
  },
  summaryGrand: {
    borderTopWidth: 1,
    borderTopColor: posTheme.colors.border,
    paddingTop: 10,
    marginTop: 4,
    marginBottom: 14,
  },
  grandLabel: {
    color: posTheme.colors.text,
    fontSize: 18,
    fontWeight: "900",
  },
  grandValue: {
    color: posTheme.colors.primary,
    fontSize: 21,
    fontWeight: "900",
  },
  summaryActions: {
    gap: posTheme.spacing.xs,
  },
  emptyWrap: {
    flex: 1,
    backgroundColor: posTheme.colors.background,
    justifyContent: "center",
    paddingHorizontal: posTheme.spacing.md,
  },
});
