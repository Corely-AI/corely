import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import type { PosSale } from "@corely/contracts";
import { ReceiptFormatter } from "@corely/pos-core";
import { useAdaptiveLayout } from "@/hooks/useAdaptiveLayout";
import { getPosLocalService } from "@/hooks/usePosLocalService";
import { getI18nLanguage, getLanguageLocaleTag } from "@/lib/i18n";
import { AppShell, Button, Card, CenteredActions, EmptyState } from "@/ui/components";
import { posTheme } from "@/ui/theme";

const formatter = new ReceiptFormatter();

export default function ReceiptScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { isTablet } = useAdaptiveLayout();
  const { saleId } = useLocalSearchParams<{ saleId: string }>();
  const [sale, setSale] = useState<PosSale | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!saleId) {
      setError(t("receipt.missingSaleId"));
      setIsLoading(false);
      return;
    }
    void loadSale(saleId);
  }, [saleId, t]);

  const loadSale = async (id: string) => {
    setIsLoading(true);
    try {
      const service = await getPosLocalService();
      const result = await service.getSaleById(id);
      if (!result) {
        setError(t("receipt.saleNotFound"));
      } else {
        setSale(result);
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : t("receipt.loadFailed"));
    } finally {
      setIsLoading(false);
    }
  };

  const receipt = useMemo(() => {
    if (!sale) {
      return null;
    }
    const language = getI18nLanguage();
    return formatter.formatForDisplay(sale, {
      locale: getLanguageLocaleTag(language),
      currency: "USD",
      cashierName: sale.cashierEmployeePartyId.slice(0, 8),
      customerName: sale.customerPartyId
        ? t("receipt.customerLabel", { id: sale.customerPartyId.slice(0, 8) })
        : null,
    });
  }, [sale, t]);

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={posTheme.colors.primary} />
      </View>
    );
  }

  if (!sale || !receipt) {
    return (
      <AppShell
        title={t("receipt.title")}
        subtitle={t("receipt.unavailableSubtitle")}
        onBack={() => router.replace("/(main)")}
      >
        <View style={styles.loading}>
          <EmptyState
            icon={<Ionicons name="warning-outline" size={42} color={posTheme.colors.danger} />}
            title={t("receipt.unavailableTitle")}
            description={error ?? t("receipt.unavailableDescription")}
            primaryAction={{
              label: t("receipt.backToShop"),
              onPress: () => router.replace("/(main)"),
            }}
          />
        </View>
      </AppShell>
    );
  }

  return (
    <AppShell
      title={t("receipt.title")}
      subtitle={t("receipt.completedSubtitle")}
      onBack={() => router.replace("/(main)")}
    >
      <View testID="pos-receipt-screen" style={[styles.layout, isTablet && styles.layoutTablet]}>
        <ScrollView style={styles.receiptPane} contentContainerStyle={styles.scrollBody}>
          <Card>
            <View style={styles.receiptHeader}>
              <Text style={styles.storeName}>{t("common.appName")}</Text>
              <Text style={styles.receiptMeta}>
                {t("receipt.saleId", { id: sale.posSaleId.slice(0, 8) })}
              </Text>
              <Text style={styles.receiptMeta}>{receipt.saleDate}</Text>
              <Text style={styles.receiptMeta}>
                {t("receipt.register", { id: sale.registerId.slice(0, 8) })}
              </Text>
              <Text style={styles.receiptMeta}>
                {t("receipt.cashier", { id: sale.cashierEmployeePartyId.slice(0, 8) })}
              </Text>
            </View>

            <Divider />
            {receipt.lineItems.map((line, idx) => (
              <View key={`${line.description}-${idx}`} style={styles.lineRow}>
                <View style={styles.lineMain}>
                  <Text style={styles.lineTitle}>{line.description}</Text>
                  <Text style={styles.lineMeta}>
                    {line.qty} × {line.unitPrice}
                  </Text>
                </View>
                <Text style={styles.lineTotal}>{line.lineTotal}</Text>
              </View>
            ))}

            <Divider />
            <ReceiptRow label={t("common.subtotal")} value={receipt.subtotal} />
            {sale.cartDiscountCents > 0 ? (
              <ReceiptRow label={t("cart.discount")} value={`-${receipt.discount}`} />
            ) : null}
            <ReceiptRow label={t("common.tax")} value={receipt.tax} />
            <ReceiptRow label={t("common.total")} value={receipt.total} strong />
            <Divider />
            {receipt.payments.map((payment, idx) => (
              <ReceiptRow
                key={`${payment.method}-${idx}`}
                label={`${payment.method}${payment.reference ? ` · ${payment.reference}` : ""}`}
                value={payment.amount}
              />
            ))}
            {receipt.change ? (
              <ReceiptRow label={t("receipt.changeDue")} value={receipt.change} positive />
            ) : null}
          </Card>
        </ScrollView>

        <View style={styles.actionsPane}>
          <Card>
            <Text testID="pos-receipt-title" style={styles.actionTitle}>
              {t("receipt.actions")}
            </Text>
            <CenteredActions maxWidth={360} style={styles.actionList}>
              <Button
                testID="pos-receipt-new-sale"
                label={t("receipt.newSale")}
                onPress={() => router.replace("/(main)")}
              />
              <Button
                testID="pos-receipt-reprint"
                label={t("receipt.printStub")}
                variant="secondary"
                onPress={() => {}}
              />
              <Button label={t("receipt.shareStub")} variant="ghost" onPress={() => {}} />
            </CenteredActions>
          </Card>
        </View>
      </View>
    </AppShell>
  );
}

function Divider() {
  return <View style={styles.sectionDivider} />;
}

function ReceiptRow({
  label,
  value,
  strong = false,
  positive = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
  positive?: boolean;
}) {
  return (
    <View style={styles.totalRow}>
      <Text style={[styles.totalLabel, strong && styles.totalLabelStrong]}>{label}</Text>
      <Text
        style={[
          styles.totalValue,
          strong && styles.totalValueStrong,
          positive && styles.totalValuePositive,
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
  },
  receiptPane: {
    flex: 1.3,
  },
  actionsPane: {
    flex: 1,
    maxWidth: 360,
  },
  scrollBody: {
    paddingBottom: posTheme.spacing.md,
  },
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: posTheme.colors.background,
  },
  receiptHeader: {
    alignItems: "center",
  },
  storeName: {
    fontSize: 26,
    fontWeight: "900",
    color: posTheme.colors.text,
    marginBottom: 8,
  },
  receiptMeta: {
    color: posTheme.colors.textMuted,
    fontSize: 13,
    marginBottom: 2,
  },
  sectionDivider: {
    height: 1,
    backgroundColor: posTheme.colors.border,
    marginVertical: 12,
  },
  lineRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
    gap: posTheme.spacing.sm,
  },
  lineMain: {
    flex: 1,
  },
  lineTitle: {
    color: posTheme.colors.text,
    fontWeight: "700",
  },
  lineMeta: {
    color: posTheme.colors.textMuted,
    fontSize: 13,
    marginTop: 2,
  },
  lineTotal: {
    color: posTheme.colors.text,
    fontWeight: "800",
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  totalLabel: {
    color: posTheme.colors.textMuted,
  },
  totalLabelStrong: {
    color: posTheme.colors.text,
    fontWeight: "800",
  },
  totalValue: {
    color: posTheme.colors.text,
    fontWeight: "700",
  },
  totalValueStrong: {
    color: posTheme.colors.primary,
    fontSize: 19,
    fontWeight: "900",
  },
  totalValuePositive: {
    color: posTheme.colors.success,
  },
  actionTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: posTheme.colors.text,
    marginBottom: posTheme.spacing.sm,
  },
  actionList: {
    gap: posTheme.spacing.xs,
  },
});
