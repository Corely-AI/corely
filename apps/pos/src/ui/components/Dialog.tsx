import { Modal, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { BUTTON_MAX_WIDTH_COMPACT, Button } from "@/ui/components/Button";
import { Card } from "@/ui/components/Card";
import { CenteredActions } from "@/ui/components/CenteredActions";
import { posTheme } from "@/ui/theme";

export function Dialog({
  visible,
  title,
  description,
  confirmLabel,
  cancelLabel,
  destructive = false,
  onCancel,
  onConfirm,
}: {
  visible: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const { t } = useTranslation();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.dialogBackdrop}>
        <Card>
          <Text style={styles.dialogTitle}>{title}</Text>
          {description ? <Text style={styles.dialogDescription}>{description}</Text> : null}
          <CenteredActions maxWidth={BUTTON_MAX_WIDTH_COMPACT} style={styles.dialogActions}>
            <Button label={cancelLabel || t("common.cancel")} variant="ghost" onPress={onCancel} />
            <Button
              label={confirmLabel || t("common.confirm")}
              variant={destructive ? "destructive" : "primary"}
              onPress={onConfirm}
            />
          </CenteredActions>
        </Card>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  dialogBackdrop: {
    flex: 1,
    backgroundColor: posTheme.colors.overlayScrim,
    justifyContent: "center",
    paddingHorizontal: posTheme.spacing.lg,
  },
  dialogTitle: {
    color: posTheme.colors.text,
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 8,
  },
  dialogDescription: {
    color: posTheme.colors.textMuted,
    marginBottom: 14,
  },
  dialogActions: {
    marginTop: posTheme.spacing.xs,
  },
});
