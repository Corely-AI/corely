import { useEffect, useMemo, useState } from "react";
import { Alert, FlatList, Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import type {
  DraftRestaurantOrderItemInput,
  ProductSnapshot,
  RestaurantModifierGroup,
  RestaurantOrderProposalCard,
} from "@corely/contracts";
import { usePosBackNavigation } from "@/hooks/usePosBackNavigation";
import { useCatalogStore } from "@/stores/catalogStore";
import { useRestaurantStore } from "@/stores/restaurantStore";
import { RestaurantCopilotPanel } from "@/components/restaurant-copilot-panel";
import { runRestaurantCopilotPrompt } from "@/lib/restaurant-copilot";
import { AppShell, Button, Card, EmptyState, ModalSheet, TextField } from "@/ui/components";
import { formatCurrencyFromCents } from "@/lib/formatters";
import { posTheme } from "@/ui/theme";
import { styles } from "@/screens/restaurant-table-order.styles";

type PendingModifierSelection = {
  product: ProductSnapshot;
  groups: RestaurantModifierGroup[];
  selectedOptionIds: Record<string, string[]>;
};

export default function RestaurantTableOrderScreen() {
  const router = useRouter();
  const goBack = usePosBackNavigation("/(main)/restaurant");
  const { tableId } = useLocalSearchParams<{ tableId: string }>();
  const { products, initialize, searchProducts } = useCatalogStore();
  const {
    activeOrder,
    floorPlan,
    modifierGroups,
    openOrResumeTable,
    requestDiscount,
    requestVoid,
    replaceDraft,
    sendToKitchen,
    transferTable,
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

  const runOrderCopilot = async (instruction: string) => {
    const relevantProducts = (await searchProducts(instruction)).slice(0, 20);
    const prompt = [
      "Call restaurant_buildOrderDraft with this exact JSON input and return the resulting tool card.",
      JSON.stringify({
        sourceText: instruction,
        tableId,
        orderId: activeOrder?.id,
        tableSessionId: activeOrder?.tableSessionId,
        activeOrder,
        modifierGroups,
        catalogProducts: relevantProducts,
        floorPlanRooms: floorPlan,
      }),
    ].join("\n\n");
    return (await runRestaurantCopilotPrompt(prompt)).card;
  };

  const applyOrderProposal = async (card: RestaurantOrderProposalCard) => {
    switch (card.action.actionType) {
      case "REPLACE_DRAFT":
        await replaceDraft(card.action.items, card.action.discountCents);
        return;
      case "REQUEST_VOID":
        await requestVoid(card.action.request.orderItemId, card.action.request.reason);
        return;
      case "REQUEST_DISCOUNT":
        await requestDiscount(card.action.request.amountCents, card.action.request.reason);
        return;
      case "TRANSFER_TABLE":
        await transferTable(card.action.transfer.toTableId);
        router.replace(`/restaurant/table/${card.action.transfer.toTableId}` as never);
        return;
      case "NOOP":
        Alert.alert("No action applied", card.action.reason);
    }
  };

  if (!activeOrder) {
    return (
      <AppShell title="Table order" subtitle="Loading active check..." onBack={goBack}>
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
      onBack={goBack}
      maxWidth={1200}
    >
      <View testID="pos-restaurant-table-screen" style={styles.layout}>
        <View style={styles.catalogPane}>
          <Card>
            <TextField
              testID="pos-restaurant-menu-search"
              value={query}
              onChangeText={onSearch}
              placeholder="Search menu items"
            />
          </Card>
          <FlatList
            data={visibleProducts}
            keyExtractor={(item) => item.productId}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => (
              <Pressable
                testID={`pos-restaurant-product-${item.productId}`}
                style={styles.productRow}
                onPress={() => onSelectProduct(item)}
              >
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
            <Text testID="pos-restaurant-order-title" style={styles.sectionTitle}>
              Current order
            </Text>
            {activeOrder.items.length === 0 ? (
              <Text testID="pos-restaurant-order-empty" style={styles.emptyHint}>
                Add menu items to start the check.
              </Text>
            ) : (
              activeOrder.items.map((item) => (
                <View
                  key={item.id}
                  testID={`pos-restaurant-order-item-${item.id}`}
                  style={styles.orderRow}
                >
                  <View style={styles.orderMain}>
                    <Text
                      testID={`pos-restaurant-order-item-name-${item.id}`}
                      style={styles.orderName}
                    >
                      {item.itemName}
                    </Text>
                    <Text
                      testID={`pos-restaurant-order-item-meta-${item.id}`}
                      style={styles.orderMeta}
                    >
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
            <View testID="pos-restaurant-order-summary" style={styles.summaryBlock}>
              <SummaryRow
                label="Subtotal"
                value={formatCurrencyFromCents(activeOrder.subtotalCents)}
              />
              <SummaryRow label="Tax" value={formatCurrencyFromCents(activeOrder.taxCents)} />
              <SummaryRow label="Total" value={formatCurrencyFromCents(activeOrder.totalCents)} />
            </View>
            <View style={styles.actionRow}>
              <Button
                testID="pos-restaurant-send-to-kitchen"
                label="Send to kitchen"
                variant="secondary"
                onPress={() => void sendToKitchen()}
                disabled={activeOrder.items.length === 0 || isMutating}
              />
              <Button
                testID="pos-restaurant-take-payment"
                label="Take payment"
                onPress={() => router.push(`/restaurant/payment/${activeOrder.id}` as never)}
                disabled={activeOrder.items.length === 0}
              />
            </View>
          </Card>
          <RestaurantCopilotPanel
            title="Order copilot"
            helperText="Parse order instructions into explicit proposal cards. Apply still uses the normal restaurant commands."
            placeholder='Try: "2 margherita, 1 coke, extra cheese"'
            runPrompt={runOrderCopilot}
            onApplyOrderProposal={applyOrderProposal}
            testIdPrefix="pos-restaurant-order-copilot"
          />
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
