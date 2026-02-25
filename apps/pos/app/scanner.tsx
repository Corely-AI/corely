import { useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useCatalogStore } from "@/stores/catalogStore";
import { useCartStore } from "@/stores/cartStore";
import { Button, EmptyState, Snackbar } from "@/ui/components";
import { posTheme } from "@/ui/theme";

export default function ScannerScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [flashEnabled, setFlashEnabled] = useState(false);
  const [toast, setToast] = useState<{
    message: string;
    tone: "success" | "warning" | "danger";
  } | null>(null);
  const { getProductByBarcode } = useCatalogStore();
  const { addItem } = useCartStore();

  const showToast = (message: string, tone: "success" | "warning" | "danger") => {
    setToast({ message, tone });
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
          icon={<Ionicons name="camera-outline" size={58} color={posTheme.colors.textMuted} />}
          title={t("scanner.scanBarcode")}
          description={t("scanner.permissionTextBarcode")}
          primaryAction={{
            label: t("scanner.grantPermission"),
            onPress: () => void requestPermission(),
          }}
          secondaryAction={{ label: t("common.notNow"), onPress: () => router.back() }}
        />
      </View>
    );
  }

  const handleBarCodeScanned = ({ data }: { type: string; data: string }) => {
    if (scanned) {
      return;
    }
    setScanned(true);

    const product = getProductByBarcode(data);
    if (product) {
      addItem({
        productId: product.productId,
        productName: product.name,
        sku: product.sku,
        quantity: 1,
        unitPriceCents: product.priceCents,
        discountCents: 0,
      });

      showToast(t("scanner.productAddedToast", { name: product.name }), "success");
      Alert.alert(
        t("scanner.productAddedTitle"),
        t("scanner.productAddedToast", { name: product.name }),
        [
          { text: t("scanner.scanAnother"), onPress: () => setScanned(false) },
          { text: t("register.viewCart"), onPress: () => router.replace("/(main)/cart") },
        ]
      );
    } else {
      showToast(t("scanner.notFoundToast"), "warning");
      Alert.alert(
        t("scanner.productNotFoundTitle"),
        t("scanner.productNotFoundMessage", { barcode: data }),
        [
          { text: t("common.tryAgain"), onPress: () => setScanned(false) },
          { text: t("common.cancel"), onPress: () => router.back() },
        ]
      );
    }
  };

  return (
    <View style={styles.container}>
      <CameraView
        style={styles.camera}
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
        enableTorch={flashEnabled}
        barcodeScannerSettings={{
          barcodeTypes: ["ean13", "ean8", "upc_a", "upc_e", "code128", "code39"],
        }}
      >
        <View style={styles.topBar}>
          <Button
            label={t("common.close")}
            variant="ghost"
            onPress={() => router.back()}
            align="stretch"
            labelLines={1}
          />
          <Text style={styles.title}>{t("scanner.scanBarcode")}</Text>
          <Button
            label={flashEnabled ? t("scanner.torchOn") : t("scanner.torchOff")}
            variant="ghost"
            onPress={() => setFlashEnabled((value) => !value)}
            align="stretch"
            labelLines={1}
          />
        </View>

        <View style={styles.overlay}>
          <View style={styles.scanArea}>
            <View style={[styles.corner, styles.topLeft]} />
            <View style={[styles.corner, styles.topRight]} />
            <View style={[styles.corner, styles.bottomLeft]} />
            <View style={[styles.corner, styles.bottomRight]} />
          </View>
          <Text style={styles.instruction}>{t("scanner.positionBarcode")}</Text>
        </View>
      </CameraView>

      {scanned ? (
        <View style={styles.processing}>
          <Text style={styles.processingText}>{t("scanner.processing")}</Text>
        </View>
      ) : null}

      {toast ? (
        <View style={styles.toastWrap}>
          <Snackbar message={toast.message} tone={toast.tone} />
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
    paddingHorizontal: posTheme.spacing.md,
    backgroundColor: posTheme.colors.background,
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
    gap: posTheme.spacing.xs,
  },
  title: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "900",
  },
  overlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  scanArea: {
    width: 300,
    height: 200,
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
  processing: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 24,
    alignItems: "center",
  },
  processingText: {
    color: "#fff",
    fontWeight: "800",
    backgroundColor: "rgba(0, 0, 0, 0.55)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  toastWrap: {
    position: "absolute",
    left: posTheme.spacing.md,
    right: posTheme.spacing.md,
    bottom: posTheme.spacing.xl,
  },
});
