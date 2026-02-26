import { useState } from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import type { CachedCustomer } from "@/services/engagementService";
import { useAuthStore } from "@/stores/authStore";
import { useEngagementService } from "@/hooks/useEngagementService";
import { useSyncEngine } from "@/hooks/useSyncEngine";
import { useAdaptiveLayout } from "@/hooks/useAdaptiveLayout";
import {
  AppShell,
  Button,
  Card,
  EmptyState,
  ListRow,
  NumericKeypad,
  TextField,
} from "@/ui/components";
import { posTheme } from "@/ui/theme";

export default function KioskLookupScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { isTablet } = useAdaptiveLayout();
  const { apiClient } = useAuthStore();
  const { engagementService } = useEngagementService();
  const { isOnline } = useSyncEngine();
  const [phone, setPhone] = useState("");
  const [nameQuery, setNameQuery] = useState("");
  const [results, setResults] = useState<CachedCustomer[]>([]);
  const [searching, setSearching] = useState(false);

  const handleSearch = async () => {
    setSearching(true);
    try {
      const cachedResults = nameQuery
        ? await engagementService?.searchCustomersByName(nameQuery)
        : phone
          ? await engagementService?.searchCustomersByPhone(phone)
          : [];

      let combined = cachedResults ?? [];

      if (isOnline && apiClient && (phone || nameQuery)) {
        try {
          const serverResults = await apiClient.searchCustomers({
            q: phone || nameQuery,
            pageSize: 10,
          });
          for (const item of serverResults.items) {
            await engagementService?.upsertCustomerCache({
              customerPartyId: item.id,
              displayName: item.displayName,
              phone: item.phone ?? null,
              email: item.email ?? null,
              tags: item.tags ?? [],
              updatedAt: new Date(),
            });
          }
          combined = [
            ...combined,
            ...serverResults.items.map((item) => ({
              customerPartyId: item.id,
              displayName: item.displayName,
              phone: item.phone ?? null,
              email: item.email ?? null,
              tags: item.tags ?? [],
              updatedAt: new Date(),
            })),
          ];
        } catch (error) {
          console.error("Customer search failed:", error);
        }
      }

      const deduped = new Map<string, CachedCustomer>();
      combined.forEach((item) => {
        deduped.set(item.customerPartyId, item);
      });
      setResults(Array.from(deduped.values()));
    } finally {
      setSearching(false);
    }
  };

  return (
    <AppShell
      title={t("kiosk.findCustomer")}
      subtitle={t("kiosk.lookupSubtitle")}
      onBack={() => router.back()}
      maxWidth={1180}
    >
      <View style={[styles.layout, isTablet && styles.layoutTablet]}>
        <Card>
          <View style={styles.form}>
            <TextField
              label={t("kiosk.phone")}
              value={phone}
              onChangeText={setPhone}
              placeholder={t("kiosk.phonePlaceholder")}
              keyboardType="phone-pad"
            />
            <TextField
              label={t("kiosk.name")}
              value={nameQuery}
              onChangeText={setNameQuery}
              placeholder={t("kiosk.namePlaceholder")}
            />
            <Button
              label={searching ? t("common.loading") : t("kiosk.search")}
              onPress={() => void handleSearch()}
              disabled={searching}
            />
          </View>

          {!isTablet ? (
            <View style={styles.keypadWrap}>
              <NumericKeypad
                onKey={(key) => {
                  if (key !== ".") {
                    setPhone((current) => `${current}${key}`);
                  }
                }}
                onBackspace={() => setPhone((current) => current.slice(0, -1))}
                onClear={() => setPhone("")}
              />
            </View>
          ) : null}
        </Card>

        <Card>
          <Text style={styles.resultTitle}>{t("kiosk.results")}</Text>
          <FlatList
            data={results}
            keyExtractor={(item) => item.customerPartyId}
            renderItem={({ item }) => (
              <ListRow
                title={item.displayName}
                subtitle={item.phone || item.email || t("kiosk.noContact")}
                showChevron
                onPress={() =>
                  router.replace({
                    pathname: "/kiosk/confirm",
                    params: { customerId: item.customerPartyId },
                  })
                }
                right={
                  <Ionicons
                    name="person-circle-outline"
                    size={20}
                    color={posTheme.colors.primary}
                  />
                }
              />
            )}
            ListEmptyComponent={
              <EmptyState
                icon={
                  <Ionicons name="person-outline" size={42} color={posTheme.colors.textMuted} />
                }
                title={t("kiosk.searchHint")}
                description={t("kiosk.lookupHint")}
              />
            }
          />
        </Card>
      </View>
    </AppShell>
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
  form: {
    gap: posTheme.spacing.sm,
  },
  keypadWrap: {
    marginTop: posTheme.spacing.md,
  },
  resultTitle: {
    color: posTheme.colors.text,
    fontWeight: "900",
    fontSize: 16,
    marginBottom: posTheme.spacing.sm,
  },
});
