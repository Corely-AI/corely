import { useEffect, useMemo, useState } from "react";
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import type {
  DraftRestaurantOrderItemInput,
  ProductSnapshot,
  RestaurantModifierGroup,
} from "@corely/contracts";
import { useCatalogStore } from "@/stores/catalogStore";
import { useRestaurantStore } from "@/stores/restaurantStore";
import { AppShell, Button, Card, EmptyState, ModalSheet, TextField } from "@/ui/components";
import { formatCurrencyFromCents } from "@/lib/formatters";
import { posTheme } from "@/ui/theme";

type PendingModifierSelection = {
  product: ProductSnapshot;
  groups: RestaurantModifierGroup[];
  selectedOptionIds: Record<string, string[]>;
};

export default function RestaurantTableOrderScreen() {
  const router = useRouter();
  const { tableId } = useLocalSearchParams<{ tableId: string }>();
  const { products, initialize, searchProducts } = useCatalogStore();
  const {
    activeOrder,
    modifierGroups,
    openOrResumeTable,
    replaceDraft,
    sendToKitchen,
    isMutating,
  } = useRestaurantStore();
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<ProductSnapshot[]>([]);
  const [pendingModifierSelection, setPendingModifierSelection] =
    useState<PendingModifierSelection | null>(null);

  useEffect(() => {
    void initialize().catch(console.error);
    if (tableId) {
      void openOrResumeTable(tableId).catch((error) => {
        Alert.alert(
          "Unable to load table",
          error instanceof Error ? error.message : "Unknown error"
        );
      });
    }
  }, [initialize, openOrResumeTable, tableId]);

  const visibleProducts = useMemo(
    () => (query.trim() ? searchResults : products),
    [products, query, searchResults]
  );

  const updateOrderItems = async (items: DraftRestaurantOrderItemInput[]) => {
    await replaceDraft(items, activeOrder?.discountCents ?? 0);
  };

  const addProduct = async (
    product: ProductSnapshot,
    selectedModifierIds?: Record<string, string[]>
  ) => {
    if (!activeOrder) {
      return;
    }
    const productModifierGroups = modifierGroups.filter((group) =>
      group.linkedCatalogItemIds.includes(product.productId)
    );
    const modifiers = productModifierGroups.flatMap((group) => {
      const chosenIds = selectedModifierIds?.[group.id] ?? [];
      return group.options
        .filter((option) => chosenIds.includes(option.id))
        .map((option) => ({
          id: `${group.id}:${option.id}:${Date.now()}`,
          modifierGroupId: group.id,
          optionName: option.name,
          quantity: 1,
          priceDeltaCents: option.priceDeltaCents,
        }));
    });

    const nextItems: DraftRestaurantOrderItemInput[] = activeOrder.items.map((item) => ({
      id: item.id,
      catalogItemId: item.catalogItemId,
      itemName: item.itemName,
      sku: item.sku,
      quantity: item.quantity,
      unitPriceCents: item.unitPriceCents,
      taxRateBps: item.taxRateBps,
      modifiers: item.modifiers.map((modifier) => ({
        id: modifier.id,
        modifierGroupId: modifier.modifierGroupId,
        optionName: modifier.optionName,
        quantity: modifier.quantity,
        priceDeltaCents: modifier.priceDeltaCents,
      })),
    }));

    nextItems.push({
      catalogItemId: product.productId,
      itemName: product.name,
      sku: product.sku,
      quantity: 1,
      unitPriceCents: product.priceCents,
      taxRateBps: product.taxable ? 700 : 0,
      modifiers,
    });
    await updateOrderItems(nextItems);
  };

  const changeQuantity = async (itemId: string, quantity: number) => {
    if (!activeOrder) {
      return;
    }
    const nextItems = activeOrder.items
      .filter((item) => item.id !== itemId || quantity > 0)
      .map((item) => ({
        id: item.id,
        catalogItemId: item.catalogItemId,
        itemName: item.itemName,
        sku: item.sku,
        quantity: item.id === itemId ? quantity : item.quantity,
        unitPriceCents: item.unitPriceCents,
        taxRateBps: item.taxRateBps,
        modifiers: item.modifiers.map((modifier) => ({
          id: modifier.id,
          modifierGroupId: modifier.modifierGroupId,
          optionName: modifier.optionName,
          quantity: modifier.quantity,
          priceDeltaCents: modifier.priceDeltaCents,
        })),
      }));
    await updateOrderItems(nextItems);
  };

  const onSearch = async (value: string) => {
    setQuery(value);
    setSearchResults(value.trim() ? await searchProducts(value) : []);
  };

  const onSelectProduct = (product: ProductSnapshot) => {
    const groups = modifierGroups.filter((group) =>
      group.linkedCatalogItemIds.includes(product.productId)
    );
    if (groups.length === 0) {
      void addProduct(product);
      return;
    }
    setPendingModifierSelection({
      product,
      groups,
      selectedOptionIds: {},
    });
  };

  if (!activeOrder) {
    return (
      <AppShell title="Table order" subtitle="Loading active check..." onBack={() => router.back()}>
        <View style={styles.emptyWrap}>
          <EmptyState title="Loading table" description="Opening or resuming the selected table." />
        </View>
      </AppShell>
    );
  }

  return (
    <AppShell
      title={`Table ${tableId?.slice(0, 8) ?? ""}`}
      subtitle={`Order ${activeOrder.id.slice(0, 8)} · ${activeOrder.status}`}
      onBack={() => router.back()}
      maxWidth={1200}
    >
      <View style={styles.layout}>
        <View style={styles.catalogPane}>
          <Card>
            <TextField value={query} onChangeText={onSearch} placeholder="Search menu items" />
          </Card>
          <FlatList
            data={visibleProducts}
            keyExtractor={(item) => item.productId}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => (
              <Pressable style={styles.productRow} onPress={() => onSelectProduct(item)}>
                <View style={styles.productMain}>
                  <Text style={styles.productName}>{item.name}</Text>
                  <Text style={styles.productMeta}>{item.sku}</Text>
                </View>
                <Text style={styles.productPrice}>{formatCurrencyFromCents(item.priceCents)}</Text>
              </Pressable>
            )}
          />
        </View>

        <View style={styles.orderPane}>
          <Card>
            <Text style={styles.sectionTitle}>Current order</Text>
            {activeOrder.items.length === 0 ? (
              <Text style={styles.emptyHint}>Add menu items to start the check.</Text>
            ) : (
              activeOrder.items.map((item) => (
                <View key={item.id} style={styles.orderRow}>
                  <View style={styles.orderMain}>
                    <Text style={styles.orderName}>{item.itemName}</Text>
                    <Text style={styles.orderMeta}>
                      {item.modifiers.map((modifier) => modifier.optionName).join(", ") ||
                        "No modifiers"}
                    </Text>
                  </View>
                  <View style={styles.qtyCluster}>
                    <Pressable
                      onPress={() => void changeQuantity(item.id, Math.max(0, item.quantity - 1))}
                    >
                      <Ionicons
                        name="remove-circle-outline"
                        size={20}
                        color={posTheme.colors.text}
                      />
                    </Pressable>
                    <Text style={styles.qtyText}>{item.quantity}</Text>
                    <Pressable onPress={() => void changeQuantity(item.id, item.quantity + 1)}>
                      <Ionicons name="add-circle-outline" size={20} color={posTheme.colors.text} />
                    </Pressable>
                  </View>
                </View>
              ))
            )}
            <View style={styles.summaryBlock}>
              <SummaryRow
                label="Subtotal"
                value={formatCurrencyFromCents(activeOrder.subtotalCents)}
              />
              <SummaryRow label="Tax" value={formatCurrencyFromCents(activeOrder.taxCents)} />
              <SummaryRow label="Total" value={formatCurrencyFromCents(activeOrder.totalCents)} />
            </View>
            <View style={styles.actionRow}>
              <Button
                label="Send to kitchen"
                variant="secondary"
                onPress={() => void sendToKitchen()}
                disabled={activeOrder.items.length === 0 || isMutating}
              />
              <Button
                label="Take payment"
                onPress={() => router.push(`/restaurant/payment/${activeOrder.id}` as never)}
                disabled={activeOrder.items.length === 0}
              />
            </View>
          </Card>
        </View>
      </View>

      <ModalSheet
        visible={Boolean(pendingModifierSelection)}
        title={
          pendingModifierSelection
            ? `Modifiers for ${pendingModifierSelection.product.name}`
            : "Modifiers"
        }
        onClose={() => setPendingModifierSelection(null)}
      >
        {pendingModifierSelection ? (
          <View style={styles.modalBody}>
            {pendingModifierSelection.groups.map((group) => (
              <View key={group.id} style={styles.modifierGroup}>
                <Text style={styles.sectionTitle}>{group.name}</Text>
                {group.options.map((option) => {
                  const selected =
                    pendingModifierSelection.selectedOptionIds[group.id]?.includes(option.id) ??
                    false;
                  return (
                    <Pressable
                      key={option.id}
                      style={[styles.optionRow, selected && styles.optionRowSelected]}
                      onPress={() => {
                        setPendingModifierSelection((current) => {
                          if (!current) {
                            return current;
                          }
                          const previous = current.selectedOptionIds[group.id] ?? [];
                          const next =
                            group.selectionMode === "SINGLE"
                              ? selected
                                ? []
                                : [option.id]
                              : selected
                                ? previous.filter((id) => id !== option.id)
                                : [...previous, option.id];
                          return {
                            ...current,
                            selectedOptionIds: {
                              ...current.selectedOptionIds,
                              [group.id]: next,
                            },
                          };
                        });
                      }}
                    >
                      <Text style={styles.orderName}>{option.name}</Text>
                      <Text style={styles.orderMeta}>
                        {option.priceDeltaCents === 0
                          ? "Included"
                          : formatCurrencyFromCents(option.priceDeltaCents)}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            ))}
            <Button
              label="Add item"
              onPress={async () => {
                try {
                  await addProduct(
                    pendingModifierSelection.product,
                    pendingModifierSelection.selectedOptionIds
                  );
                  setPendingModifierSelection(null);
                } catch (error) {
                  Alert.alert(
                    "Unable to add item",
                    error instanceof Error ? error.message : "Unknown error"
                  );
                }
              }}
            />
          </View>
        ) : null}
      </ModalSheet>
    </AppShell>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.summaryRow}>
      <Text style={styles.orderMeta}>{label}</Text>
      <Text style={styles.orderName}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  layout: {
    flex: 1,
    gap: posTheme.spacing.md,
  },
  catalogPane: {
    flex: 1.2,
    gap: posTheme.spacing.sm,
  },
  orderPane: {
    flex: 1,
  },
  listContent: {
    gap: posTheme.spacing.sm,
    paddingVertical: posTheme.spacing.sm,
  },
  productRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: posTheme.spacing.md,
    backgroundColor: posTheme.colors.surface,
    borderRadius: posTheme.radius.lg,
    borderWidth: 1,
    borderColor: posTheme.colors.border,
  },
  productMain: {
    flex: 1,
    gap: 2,
  },
  productName: {
    color: posTheme.colors.text,
    fontWeight: "700",
  },
  productMeta: {
    color: posTheme.colors.textMuted,
    fontSize: 12,
  },
  productPrice: {
    color: posTheme.colors.text,
    fontWeight: "700",
  },
  sectionTitle: {
    color: posTheme.colors.text,
    fontSize: 16,
    fontWeight: "700",
    marginBottom: posTheme.spacing.sm,
  },
  emptyWrap: {
    flex: 1,
    justifyContent: "center",
  },
  emptyHint: {
    color: posTheme.colors.textMuted,
    marginBottom: posTheme.spacing.md,
  },
  orderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: posTheme.spacing.sm,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: posTheme.colors.border,
  },
  orderMain: {
    flex: 1,
    gap: 4,
  },
  orderName: {
    color: posTheme.colors.text,
    fontWeight: "700",
  },
  orderMeta: {
    color: posTheme.colors.textMuted,
    fontSize: 12,
  },
  qtyCluster: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  qtyText: {
    minWidth: 20,
    color: posTheme.colors.text,
    textAlign: "center",
    fontWeight: "700",
  },
  summaryBlock: {
    marginTop: posTheme.spacing.md,
    gap: 8,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  actionRow: {
    flexDirection: "row",
    gap: posTheme.spacing.sm,
    marginTop: posTheme.spacing.md,
  },
  modalBody: {
    gap: posTheme.spacing.md,
  },
  modifierGroup: {
    gap: posTheme.spacing.sm,
  },
  optionRow: {
    padding: posTheme.spacing.md,
    borderRadius: posTheme.radius.lg,
    backgroundColor: posTheme.colors.surface,
    borderWidth: 1,
    borderColor: posTheme.colors.border,
  },
  optionRowSelected: {
    backgroundColor: posTheme.colors.primaryMuted,
  },
});
