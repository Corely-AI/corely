import type { PropsWithChildren } from "react";
import { StyleSheet, View } from "react-native";
import { posTheme } from "@/ui/theme";

export function AppScreen({
  children,
  maxWidth = 1240,
  padded = true,
}: PropsWithChildren<{ maxWidth?: number; padded?: boolean }>) {
  return (
    <View style={styles.screenRoot}>
      <View style={[styles.screenInner, { maxWidth }, padded && styles.screenInnerPadded]}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screenRoot: {
    flex: 1,
    backgroundColor: posTheme.colors.background,
  },
  screenInner: {
    flex: 1,
    width: "100%",
    alignSelf: "center",
  },
  screenInnerPadded: {
    paddingHorizontal: posTheme.spacing.md,
    paddingVertical: posTheme.spacing.sm,
  },
});
