import { useEffect, useMemo, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import type { ProductSnapshot } from "@corely/contracts";
import { useAdaptiveLayout } from "@/hooks/useAdaptiveLayout";
import { formatCurrencyFromCents } from "@/lib/formatters";
import { useAuthStore } from "@/stores/authStore";
import { useCartStore } from "@/stores/cartStore";
import { useCatalogStore } from "@/stores/catalogStore";
import { useRegisterStore } from "@/stores/registerStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { useShiftStore } from "@/stores/shiftStore";
import { Badge, Button, Card, EmptyState, SegmentedControl, TextField } from "@/ui/components";
import { posTheme } from "@/ui/theme";

type ProductFilter = "ALL" | "IN_CART";

export default function POSHomeScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { isTablet, isWide } = useAdaptiveLayout();
  const { user } = useAuthStore();
  const { selectedRegister } = useRegisterStore();
  const { currentShift, loadCurrentShift } = useShiftStore();
  const { addItem, items, getTotals } = useCartStore();
  const { products, searchProducts, syncCatalog, isLoading: catalogSyncing } = useCatalogStore();
  const requireOpenShiftForSales = useSettingsStore((state) => state.requireOpenShiftForSales);

  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<ProductFilter>("ALL");
  const [searchResults, setSearchResults] = useState(products);
  const totals = getTotals();

  const cartBadge = useMemo(() => t("home.cartItems", { count: items.length }), [items.length, t]);
  const productsWithCartQty = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of items) {
      map.set(item.productId, (map.get(item.productId) ?? 0) + item.quantity);
    }
    return map;
  }, [items]);

  const filteredProducts = useMemo(() => {
    const source = searchQuery.trim() ? searchResults : products;
    if (filter === "IN_CART") {
      return source.filter((item) => productsWithCartQty.has(item.productId));
    }
    return source;
  }, [filter, products, productsWithCartQty, searchQuery, searchResults]);

  useEffect(() => {
    if (selectedRegister) {
      void loadCurrentShift(selectedRegister.registerId);
    }
  }, [loadCurrentShift, selectedRegister]);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults(products);
    }
  }, [products, searchQuery]);

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    const normalized = query.trim();
    if (!normalized) {
      setSearchResults(products);
      return;
    }
    const result = await searchProducts(normalized);
    setSearchResults(result);
  };

  const handleAddToCart = (product: ProductSnapshot) => {
    addItem({
      productId: product.productId,
      productName: product.name,
      sku: product.sku,
      quantity: 1,
      unitPriceCents: product.priceCents,
      discountCents: 0,
    });
  };

  if (!selectedRegister) {
    return (
      <View testID="pos-home-guard-no-register" style={styles.guard}>
        <EmptyState
          icon={<Ionicons name="desktop-outline" size={48} color={posTheme.colors.textMuted} />}
          title={t("register.noRegisterTitle")}
          description={t("home.noRegisterDescription", {
            email: user?.email ?? t("settings.posOperator"),
            workspace: user?.workspaceId ? user.workspaceId.slice(0, 8) : t("settings.noWorkspace"),
          })}
          primaryAction={{
            label: t("register.selectRegister"),
            onPress: () => router.push("/register-selection"),
            testID: "pos-home-select-register",
          }}
        />
      </View>
    );
  }

  if (!currentShift && requireOpenShiftForSales) {
    return (
      <View testID="pos-home-guard-open-shift" style={styles.guard}>
        <EmptyState
          icon={<Ionicons name="time-outline" size={48} color={posTheme.colors.textMuted} />}
          title={t("register.noActiveShiftTitle")}
          description={t("register.noActiveShiftDescription")}
          primaryAction={{
            label: t("register.openShift"),
            onPress: () => router.push("/shift/open"),
            testID: "pos-home-open-shift",
          }}
          secondaryAction={{
            label: t("home.changeRegister"),
            onPress: () => router.push("/register-selection"),
          }}
        />
      </View>
    );
  }

  return (
    <View testID="pos-home-screen" style={styles.container}>
      <View style={styles.searchRow}>
        <View style={styles.searchFieldWrap}>
          <TextField
            testID="pos-home-search-input"
            value={searchQuery}
            onChangeText={handleSearch}
            placeholder={t("home.searchPlaceholder")}
          />
        </View>
        <Pressable
          style={styles.scanBtn}
          onPress={() => router.push("/scanner")}
          accessibilityRole="button"
          accessibilityLabel={t("home.openScanner")}
        >
          <Ionicons name="barcode-outline" size={22} color={posTheme.colors.primary} />
        </Pressable>
      </View>

      <SegmentedControl
        value={filter}
        onChange={setFilter}
        options={[
          { value: "ALL", label: t("common.all"), count: products.length },
          { value: "IN_CART", label: t("home.inCart"), count: items.length },
        ]}
      />

      <View style={[styles.mainArea, isTablet && styles.mainAreaTablet]}>
        <Card>
          {filteredProducts.length === 0 ? (
            <EmptyState
              icon={<Ionicons name="cube-outline" size={44} color={posTheme.colors.textMuted} />}
              title={t("home.noProductsTitle")}
              description={t("home.noProductsDescription")}
              primaryAction={{
                label: catalogSyncing ? t("sync.syncing") : t("home.syncCatalog"),
                onPress: () => void syncCatalog(false),
              }}
              secondaryAction={{
                label: t("home.goToSync"),
                onPress: () => router.push("/(main)/sync"),
              }}
            />
          ) : (
            <FlatList
              data={filteredProducts}
              keyExtractor={(item) => item.productId}
              contentContainerStyle={styles.listContent}
              renderItem={({ item }) => (
                <ProductRow
                  product={item}
                  cartQty={productsWithCartQty.get(item.productId) ?? 0}
                  onAdd={() => handleAddToCart(item)}
                />
              )}
            />
          )}
        </Card>

        {isTablet ? (
          <View style={[styles.cartPane, isWide && styles.cartPaneWide]}>
            <Card>
              <Text style={styles.cartTitle}>{t("home.currentCart")}</Text>
              <Text style={styles.cartMeta}>{cartBadge}</Text>
              {items.length ? (
                items.slice(0, 6).map((item) => (
                  <View key={item.lineItemId} style={styles.cartLine}>
                    <Text style={styles.cartLineName} numberOfLines={1}>
                      {item.productName}
                    </Text>
                    <Text style={styles.cartLineValue}>
                      {t("home.quantityPrice", {
                        quantity: item.quantity,
                        price: formatCurrencyFromCents(item.unitPriceCents),
                      })}
                    </Text>
                  </View>
                ))
              ) : (
                <Text style={styles.emptyCartHint}>{t("home.emptyCartHint")}</Text>
              )}

              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>{t("common.subtotal")}</Text>
                <Text style={styles.totalValue}>
                  {formatCurrencyFromCents(totals.subtotalCents)}
                </Text>
              </View>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>{t("common.tax")}</Text>
                <Text style={styles.totalValue}>{formatCurrencyFromCents(totals.taxCents)}</Text>
              </View>
              <View style={[styles.totalRow, styles.totalRowGrand]}>
                <Text style={styles.totalGrandLabel}>{t("common.total")}</Text>
                <Text style={styles.totalGrandValue}>
                  {formatCurrencyFromCents(totals.totalCents)}
                </Text>
              </View>
              <Button
                testID="pos-home-open-cart"
                label={items.length ? t("home.reviewCart") : t("home.startCart")}
                variant={items.length ? "primary" : "secondary"}
                onPress={() => router.push("/(main)/cart")}
              />
            </Card>
          </View>
        ) : null}
      </View>

      {!isTablet && items.length > 0 ? (
        <Pressable
          testID="pos-home-bottom-cart"
          style={styles.bottomCart}
          onPress={() => router.push("/(main)/cart")}
        >
          <Text style={styles.bottomCartText}>{cartBadge}</Text>
          <Text style={styles.bottomCartText}>{formatCurrencyFromCents(totals.totalCents)}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function ProductRow({
  product,
  cartQty,
  onAdd,
}: {
  product: ProductSnapshot;
  cartQty: number;
  onAdd: () => void;
}) {
  const { t } = useTranslation();

  return (
    <Pressable
      testID={`pos-home-product-${product.productId}`}
      onPress={onAdd}
      style={({ pressed }) => [styles.productRow, pressed && styles.productRowPressed]}
      accessibilityRole="button"
      accessibilityLabel={t("home.accessibilityAddProduct", { name: product.name })}
    >
      <View style={styles.productMain}>
        <Text style={styles.productName}>{product.name}</Text>
        <Text style={styles.productMeta}>
          {product.sku}
          {product.barcode ? ` · ${product.barcode}` : ""}
        </Text>
      </View>
      <View style={styles.productRight}>
        <Text style={styles.productPrice}>{formatCurrencyFromCents(product.priceCents)}</Text>
        {cartQty > 0 ? (
          <Badge label={t("home.inCartCount", { count: cartQty })} tone="info" />
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: posTheme.colors.background,
    padding: posTheme.spacing.md,
    gap: posTheme.spacing.sm,
  },
  guard: {
    flex: 1,
    backgroundColor: posTheme.colors.background,
    padding: posTheme.spacing.md,
    justifyContent: "center",
  },
  searchRow: {
    flexDirection: "row",
    gap: posTheme.spacing.xs,
  },
  searchFieldWrap: {
    flex: 1,
  },
  scanBtn: {
    width: 48,
    borderRadius: posTheme.radius.md,
    borderWidth: 1,
    borderColor: posTheme.colors.border,
    backgroundColor: posTheme.colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  mainArea: {
    flex: 1,
  },
  mainAreaTablet: {
    flexDirection: "row",
    gap: posTheme.spacing.md,
  },
  listContent: {
    gap: 2,
    paddingBottom: posTheme.spacing.md,
  },
  productRow: {
    minHeight: 62,
    borderBottomWidth: 1,
    borderBottomColor: posTheme.colors.border,
    paddingVertical: posTheme.spacing.xs,
    paddingHorizontal: posTheme.spacing.xs,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: posTheme.spacing.sm,
  },
  productRowPressed: {
    backgroundColor: posTheme.colors.surfaceMuted,
  },
  productMain: {
    flex: 1,
  },
  productName: {
    color: posTheme.colors.text,
    fontSize: 16,
    fontWeight: "700",
  },
  productMeta: {
    color: posTheme.colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  productRight: {
    alignItems: "flex-end",
    gap: 4,
  },
  productPrice: {
    color: posTheme.colors.primary,
    fontSize: 17,
    fontWeight: "900",
  },
  cartPane: {
    flex: 1,
  },
  cartPaneWide: {
    maxWidth: 420,
  },
  cartTitle: {
    color: posTheme.colors.text,
    fontSize: 20,
    fontWeight: "800",
  },
  cartMeta: {
    color: posTheme.colors.textMuted,
    marginBottom: posTheme.spacing.sm,
  },
  emptyCartHint: {
    color: posTheme.colors.textMuted,
    marginBottom: posTheme.spacing.sm,
  },
  cartLine: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: posTheme.spacing.sm,
    marginBottom: 6,
  },
  cartLineName: {
    flex: 1,
    color: posTheme.colors.text,
    fontWeight: "600",
  },
  cartLineValue: {
    color: posTheme.colors.textMuted,
    fontSize: 12,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  totalLabel: {
    color: posTheme.colors.textMuted,
  },
  totalValue: {
    color: posTheme.colors.text,
    fontWeight: "700",
  },
  totalRowGrand: {
    borderTopWidth: 1,
    borderTopColor: posTheme.colors.border,
    marginTop: posTheme.spacing.xs,
    paddingTop: posTheme.spacing.xs,
    marginBottom: posTheme.spacing.sm,
  },
  totalGrandLabel: {
    color: posTheme.colors.text,
    fontSize: 16,
    fontWeight: "900",
  },
  totalGrandValue: {
    color: posTheme.colors.primary,
    fontSize: 20,
    fontWeight: "900",
  },
  bottomCart: {
    borderRadius: posTheme.radius.lg,
    backgroundColor: posTheme.colors.primary,
    paddingHorizontal: posTheme.spacing.md,
    paddingVertical: posTheme.spacing.sm,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  bottomCartText: {
    color: posTheme.colors.white,
    fontWeight: "800",
  },
});
