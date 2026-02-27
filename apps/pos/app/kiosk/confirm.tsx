import { useEffect, useRef, useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { v4 as uuidv4 } from "@lukeed/uuid";
import { useTranslation } from "react-i18next";
import { HttpError } from "@corely/api-client";
import type { CreateCheckInEventInput } from "@corely/contracts";
import { useAuthStore } from "@/stores/authStore";
import { useRegisterStore } from "@/stores/registerStore";
import { useEngagementService } from "@/hooks/useEngagementService";
import { useSyncEngine } from "@/hooks/useSyncEngine";
import { getOutboxStore } from "@/lib/offline/outboxStore";
import { buildCreateCheckInCommand } from "@/offline/engagementOutbox";
import { AppShell, Badge, Button, Card, CenteredActions, TextField } from "@/ui/components";
import { posTheme } from "@/ui/theme";

export default function KioskConfirmScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { customerId } = useLocalSearchParams<{ customerId: string }>();
  const { apiClient, user } = useAuthStore();
  const { selectedRegister } = useRegisterStore();
  const { engagementService } = useEngagementService();
  const { isOnline, triggerSync } = useSyncEngine();
  const [customerName, setCustomerName] = useState<string>(t("kiosk.customerFallback"));
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const checkInIdRef = useRef<string | null>(null);

  useEffect(() => {
    const loadCustomer = async () => {
      if (!customerId) {
        return;
      }
      const cached = await engagementService?.getCustomerById(customerId);
      if (cached) {
        setCustomerName(cached.displayName);
      } else if (apiClient) {
        try {
          const fetched = await apiClient.getCustomer({ id: customerId });
          setCustomerName(fetched.displayName);
        } catch (error) {
          console.error("Failed to load customer:", error);
        }
      }
    };
    void loadCustomer();
  }, [customerId, engagementService, apiClient]);

  const handleConfirm = async (overrideDuplicate = false) => {
    if (!customerId || !selectedRegister || !user?.workspaceId) {
      Alert.alert(t("kiosk.missingInfoTitle"), t("kiosk.missingInfoMessage"));
      return;
    }

    setSubmitting(true);
    if (!checkInIdRef.current) {
      checkInIdRef.current = uuidv4();
    }
    const checkInEventId = checkInIdRef.current;
    const payload: CreateCheckInEventInput = {
      checkInEventId,
      customerPartyId: customerId,
      registerId: selectedRegister.registerId,
      checkedInByType: "SELF_SERVICE",
      checkedInByEmployeePartyId: user.userId ?? null,
      checkedInAt: new Date().toISOString(),
      visitReason: reason || null,
      overrideDuplicate,
    };

    const now = new Date();

    try {
      if (isOnline && apiClient) {
        const idempotencyKey = uuidv4();
        const result = await apiClient.createCheckIn(payload, idempotencyKey);
        await engagementService?.addOrUpdateCheckIn({
          checkInEventId,
          customerPartyId: customerId,
          registerId: selectedRegister.registerId,
          status: result.checkInEvent.status,
          checkedInAt: new Date(result.checkInEvent.checkedInAt),
          visitReason: reason || null,
          assignedEmployeePartyId: result.checkInEvent.assignedEmployeePartyId ?? null,
          notes: result.checkInEvent.notes ?? null,
          pointsAwarded: result.pointsAwarded ?? null,
          syncStatus: "SYNCED",
          syncError: null,
          createdAt: now,
          updatedAt: now,
        });
        router.replace({
          pathname: "/kiosk/success",
          params: {
            customerId,
            points: result.pointsAwarded?.toString() ?? "0",
          },
        });
      } else {
        const idempotencyKey = uuidv4();
        const outboxStore = await getOutboxStore();
        await outboxStore.enqueue(
          buildCreateCheckInCommand(user.workspaceId, payload, idempotencyKey)
        );
        await engagementService?.addOrUpdateCheckIn({
          checkInEventId,
          customerPartyId: customerId,
          registerId: selectedRegister.registerId,
          status: "ACTIVE",
          checkedInAt: payload.checkedInAt ? new Date(payload.checkedInAt) : now,
          visitReason: reason || null,
          assignedEmployeePartyId: null,
          notes: null,
          pointsAwarded: null,
          syncStatus: "PENDING",
          syncError: null,
          createdAt: now,
          updatedAt: now,
        });
        router.replace({ pathname: "/kiosk/success", params: { customerId, points: "0" } });
        await triggerSync();
      }
    } catch (error) {
      if (error instanceof HttpError && error.status === 409) {
        Alert.alert(t("kiosk.duplicateTitle"), t("kiosk.duplicateMessage"), [
          { text: t("common.cancel"), style: "cancel", onPress: () => setSubmitting(false) },
          {
            text: t("common.proceed"),
            onPress: () => {
              void handleConfirm(true);
            },
          },
        ]);
        return;
      }
      Alert.alert(t("kiosk.checkInFailedTitle"), t("kiosk.checkInFailedMessage"));
      console.error("Check-in error:", error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppShell
      title={t("kiosk.confirmTitle")}
      subtitle={t("kiosk.confirmSubtitle")}
      onBack={() => router.back()}
      maxWidth={760}
    >
      <Card>
        <View style={styles.customerBlock}>
          <Ionicons name="person-circle-outline" size={64} color={posTheme.colors.primary} />
          <Text style={styles.customerName}>{customerName}</Text>
          <Badge
            label={isOnline ? t("status.online") : t("status.offline")}
            tone={isOnline ? "success" : "warning"}
          />
        </View>

        <TextField
          label={t("kiosk.reasonOptional")}
          value={reason}
          onChangeText={setReason}
          placeholder={t("kiosk.reasonPlaceholder")}
        />

        <CenteredActions maxWidth={360} style={styles.actions}>
          <Button
            label={t("kiosk.confirm")}
            onPress={() => void handleConfirm()}
            loading={submitting}
          />
          <Button label={t("common.cancel")} variant="ghost" onPress={() => router.back()} />
        </CenteredActions>
      </Card>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  customerBlock: {
    alignItems: "center",
    gap: posTheme.spacing.xs,
    marginBottom: posTheme.spacing.sm,
  },
  customerName: {
    color: posTheme.colors.text,
    fontSize: 24,
    fontWeight: "900",
  },
  actions: {
    marginTop: posTheme.spacing.md,
    gap: posTheme.spacing.xs,
  },
});
