import type { PropsWithChildren } from "react";
import { StyleSheet, View } from "react-native";
import { posTheme } from "@/ui/theme";

export function Card({ children, padded = true }: PropsWithChildren<{ padded?: boolean }>) {
  return <View style={[styles.card, padded && styles.cardPadded]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: posTheme.colors.surface,
    borderRadius: posTheme.radius.lg,
    borderColor: posTheme.colors.border,
    borderWidth: 1,
    ...posTheme.elevation.card,
  },
  cardPadded: {
    padding: posTheme.spacing.md,
  },
});
