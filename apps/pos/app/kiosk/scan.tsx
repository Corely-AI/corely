import { useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useAuthStore } from "@/stores/authStore";
import { useEngagementService } from "@/hooks/useEngagementService";
import { useSyncEngine } from "@/hooks/useSyncEngine";
import { Button, EmptyState, Snackbar } from "@/ui/components";
import { posTheme } from "@/ui/theme";

const parseCustomerId = (payload: string) => {
  if (payload.startsWith("customer:")) {
    return payload.replace("customer:", "");
  }
  if (payload.startsWith("party:")) {
    return payload.replace("party:", "");
  }
  return payload;
};

export default function KioskScanScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const { apiClient } = useAuthStore();
  const { engagementService } = useEngagementService();
  const { isOnline } = useSyncEngine();

  const showToast = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 1800);
  };

  if (!permission) {
    return (
      <View style={styles.permissionShell}>
        <Text style={styles.permissionText}>{t("scanner.requestingPermission")}</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.permissionShell}>
        <EmptyState
          title={t("scanner.scanQr")}
          description={t("scanner.permissionTextQr")}
          primaryAction={{
            label: t("scanner.grantPermission"),
            onPress: () => void requestPermission(),
          }}
          secondaryAction={{ label: t("common.notNow"), onPress: () => router.back() }}
        />
      </View>
    );
  }

  const handleQrScanned = async ({ data }: { data: string }) => {
    if (scanned) {
      return;
    }
    setScanned(true);
    const customerPartyId = parseCustomerId(data);

    let customer = await engagementService?.getCustomerById(customerPartyId);
    if (!customer && isOnline && apiClient) {
      try {
        const fetched = await apiClient.getCustomer({ id: customerPartyId });
        await engagementService?.upsertCustomerCache({
          customerPartyId: fetched.id,
          displayName: fetched.displayName,
          phone: fetched.phone ?? null,
          email: fetched.email ?? null,
          tags: fetched.tags ?? [],
          updatedAt: new Date(),
        });
        customer = await engagementService?.getCustomerById(customerPartyId);
      } catch (error) {
        console.error("Failed to fetch customer:", error);
      }
    }

    if (!customer) {
      showToast(t("kiosk.customerNotFound"));
      Alert.alert(t("kiosk.customerNotFound"), t("kiosk.customerNotFoundQrMessage"), [
        {
          text: t("kiosk.enterPhone"),
          onPress: () => router.replace("/kiosk/lookup"),
        },
        {
          text: t("common.tryAgain"),
          onPress: () => setScanned(false),
        },
      ]);
      return;
    }

    router.replace({
      pathname: "/kiosk/confirm",
      params: { customerId: customer.customerPartyId },
    });
  };

  return (
    <View style={styles.container}>
      <CameraView
        style={styles.camera}
        onBarcodeScanned={scanned ? undefined : handleQrScanned}
        barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
      >
        <View style={styles.topBar}>
          <Button
            label={t("common.back")}
            variant="ghost"
            onPress={() => router.back()}
            align="stretch"
            labelLines={1}
          />
          <Text style={styles.title}>{t("scanner.scanQr")}</Text>
          <View style={styles.stub} />
        </View>

        <View style={styles.overlay}>
          <View style={styles.scanArea}>
            <View style={[styles.corner, styles.topLeft]} />
            <View style={[styles.corner, styles.topRight]} />
            <View style={[styles.corner, styles.bottomLeft]} />
            <View style={[styles.corner, styles.bottomRight]} />
          </View>
          <Text style={styles.instruction}>{t("scanner.positionQr")}</Text>
        </View>
      </CameraView>

      {toast ? (
        <View style={styles.toast}>
          <Snackbar message={toast} tone="warning" />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  camera: {
    flex: 1,
  },
  permissionShell: {
    flex: 1,
    justifyContent: "center",
    backgroundColor: posTheme.colors.background,
    paddingHorizontal: posTheme.spacing.md,
  },
  permissionText: {
    color: posTheme.colors.textMuted,
    textAlign: "center",
  },
  topBar: {
    marginTop: posTheme.spacing.md,
    marginHorizontal: posTheme.spacing.sm,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "900",
  },
  stub: {
    width: 70,
  },
  overlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  scanArea: {
    width: 260,
    height: 260,
    position: "relative",
  },
  corner: {
    position: "absolute",
    width: 40,
    height: 40,
    borderColor: posTheme.colors.accent,
  },
  topLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
  },
  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
  },
  instruction: {
    color: "#fff",
    fontSize: 15,
    marginTop: 24,
    textAlign: "center",
  },
  toast: {
    position: "absolute",
    left: posTheme.spacing.md,
    right: posTheme.spacing.md,
    bottom: posTheme.spacing.xl,
  },
});
