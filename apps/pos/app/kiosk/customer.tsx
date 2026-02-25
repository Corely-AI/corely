import { useEffect, useState } from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useAuthStore } from "@/stores/authStore";
import { useEngagementService } from "@/hooks/useEngagementService";
import { useSyncEngine } from "@/hooks/useSyncEngine";
import { AppShell, Badge, Card, EmptyState, ListRow } from "@/ui/components";
import { posTheme } from "@/ui/theme";

type LedgerEntry = {
  entryId: string;
  reasonCode: string;
  pointsDelta: number;
};

export default function KioskCustomerScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { customerId } = useLocalSearchParams<{ customerId: string }>();
  const { apiClient } = useAuthStore();
  const { engagementService } = useEngagementService();
  const { isOnline } = useSyncEngine();
  const [customerName, setCustomerName] = useState<string>(
    customerId ?? t("kiosk.customerFallback")
  );
  const [pointsBalance, setPointsBalance] = useState<number | null>(null);
  const [ledgerItems, setLedgerItems] = useState<LedgerEntry[]>([]);

  useEffect(() => {
    const load = async () => {
      if (!customerId) {
        return;
      }
      const cached = await engagementService?.getCustomerById(customerId);
      if (cached) {
        setCustomerName(cached.displayName);
      }

      const cachedLoyalty = await engagementService?.getLoyaltySummary(customerId);
      if (cachedLoyalty) {
        setPointsBalance(cachedLoyalty.pointsBalance);
      }

      if (isOnline && apiClient) {
        try {
          const loyalty = await apiClient.getLoyaltySummary({ customerPartyId: customerId });
          setPointsBalance(loyalty.account.currentPointsBalance);
          await engagementService?.upsertLoyaltySummary({
            customerPartyId: customerId,
            pointsBalance: loyalty.account.currentPointsBalance,
            updatedAt: new Date(),
          });
          const ledger = await apiClient.listLoyaltyLedger({
            customerPartyId: customerId,
            pageSize: 20,
          });
          setLedgerItems(
            ledger.items.map((item) => ({
              entryId: item.entryId,
              reasonCode: item.reasonCode,
              pointsDelta: item.pointsDelta,
            }))
          );
        } catch (error) {
          console.error("Failed to load loyalty data:", error);
        }
      }
    };
    void load();
  }, [customerId, engagementService, apiClient, isOnline]);

  return (
    <AppShell
      title={t("kiosk.customerProfile")}
      subtitle={customerName}
      onBack={() => router.back()}
      maxWidth={980}
    >
      <Card>
        <View style={styles.summaryRow}>
          <Ionicons name="person-circle-outline" size={56} color={posTheme.colors.primary} />
          <View style={styles.summaryText}>
            <Text style={styles.customerName}>{customerName}</Text>
            <Text style={styles.pointsText}>
              {t("kiosk.pointsBalance", { points: pointsBalance ?? "—" })}
            </Text>
          </View>
          <Badge label={`${pointsBalance ?? "—"}`} tone="info" />
        </View>
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>{t("kiosk.loyaltyLedger")}</Text>
        <FlatList
          data={ledgerItems}
          keyExtractor={(item) => item.entryId}
          renderItem={({ item }) => (
            <ListRow
              title={item.reasonCode}
              subtitle={t("kiosk.pointsDelta", { points: item.pointsDelta })}
              right={
                <Badge
                  label={item.pointsDelta >= 0 ? t("kiosk.earned") : t("kiosk.used")}
                  tone={item.pointsDelta >= 0 ? "success" : "warning"}
                />
              }
            />
          )}
          ListEmptyComponent={
            <EmptyState
              icon={<Ionicons name="receipt-outline" size={42} color={posTheme.colors.textMuted} />}
              title={t("kiosk.noLedger")}
              description={t("kiosk.noLedgerHint")}
            />
          }
        />
      </Card>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: posTheme.spacing.sm,
  },
  summaryText: {
    flex: 1,
  },
  customerName: {
    color: posTheme.colors.text,
    fontSize: 20,
    fontWeight: "900",
  },
  pointsText: {
    color: posTheme.colors.textMuted,
  },
  sectionTitle: {
    color: posTheme.colors.text,
    fontSize: 16,
    fontWeight: "900",
    marginBottom: posTheme.spacing.sm,
  },
});
