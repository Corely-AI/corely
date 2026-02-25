import type { PropsWithChildren } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { posTheme } from "@/ui/theme";

export function ModalSheet({
  visible,
  title,
  onClose,
  children,
}: PropsWithChildren<{ visible: boolean; title?: string; onClose: () => void }>) {
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.sheetBackdrop} onPress={onClose}>
        <Pressable style={styles.sheetBody} onPress={() => {}}>
          <View style={styles.sheetHandle} />
          {title ? <Text style={styles.sheetTitle}>{title}</Text> : null}
          {children}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  sheetBackdrop: {
    flex: 1,
    backgroundColor: posTheme.colors.overlayScrim,
    justifyContent: "flex-end",
  },
  sheetBody: {
    backgroundColor: posTheme.colors.surface,
    borderTopLeftRadius: posTheme.radius.xl,
    borderTopRightRadius: posTheme.radius.xl,
    padding: posTheme.spacing.md,
    minHeight: 220,
  },
  sheetHandle: {
    alignSelf: "center",
    width: 46,
    height: 4,
    borderRadius: 2,
    backgroundColor: posTheme.colors.border,
    marginBottom: 12,
  },
  sheetTitle: {
    color: posTheme.colors.text,
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 10,
  },
});
