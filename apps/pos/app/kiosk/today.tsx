import { useEffect, useState } from "react";
import { FlatList, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useEngagementService } from "@/hooks/useEngagementService";
import { formatTime } from "@/lib/formatters";
import { AppShell, Card, EmptyState, ListRow } from "@/ui/components";
import { posTheme } from "@/ui/theme";

type CheckInView = {
  checkInEventId: string;
  customerPartyId: string;
  customerName: string;
  checkedInAt: Date;
  syncStatus: string;
};

export default function KioskTodayScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { engagementService } = useEngagementService();
  const [checkIns, setCheckIns] = useState<CheckInView[]>([]);

  useEffect(() => {
    const load = async () => {
      const items = await engagementService?.listTodayCheckIns();
      const withNames = await Promise.all(
        (items ?? []).map(async (item) => {
          const customer = await engagementService?.getCustomerById(item.customerPartyId);
          return {
            checkInEventId: item.checkInEventId,
            customerPartyId: item.customerPartyId,
            customerName: customer?.displayName ?? item.customerPartyId,
            checkedInAt: new Date(item.checkedInAt),
            syncStatus: item.syncStatus,
          };
        })
      );
      setCheckIns(withNames);
    };
    void load();
  }, [engagementService]);

  return (
    <AppShell
      title={t("kiosk.todayCheckIns")}
      subtitle={t("kiosk.checkInCount", { count: checkIns.length })}
      onBack={() => router.back()}
      maxWidth={960}
    >
      <Card>
        <FlatList
          data={checkIns}
          keyExtractor={(item) => item.checkInEventId}
          renderItem={({ item }) => (
            <ListRow
              title={item.customerName}
              subtitle={`${formatTime(item.checkedInAt)} · ${item.syncStatus}`}
              showChevron
              onPress={() =>
                router.push({
                  pathname: "/kiosk/customer",
                  params: { customerId: item.customerPartyId },
                })
              }
            />
          )}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <EmptyState
                icon={<Ionicons name="list-outline" size={44} color={posTheme.colors.textMuted} />}
                title={t("kiosk.noCheckIns")}
                description={t("kiosk.noCheckInsHint")}
                primaryAction={{
                  label: t("kiosk.scanQr"),
                  onPress: () => router.push("/kiosk/scan"),
                }}
                secondaryAction={{
                  label: t("kiosk.phoneLookup"),
                  onPress: () => router.push("/kiosk/lookup"),
                }}
              />
            </View>
          }
        />
      </Card>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  emptyWrap: {
    paddingVertical: posTheme.spacing.sm,
  },
});
