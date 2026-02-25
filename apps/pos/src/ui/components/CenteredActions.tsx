import type { PropsWithChildren } from "react";
import type { StyleProp, ViewStyle } from "react-native";
import { StyleSheet, View } from "react-native";
import { useAdaptiveLayout } from "@/hooks/useAdaptiveLayout";
import { BUTTON_MAX_WIDTH, type ButtonAlign } from "@/ui/components/Button";
import { posTheme } from "@/ui/theme";

export function CenteredActions({
  children,
  maxWidth = BUTTON_MAX_WIDTH,
  gap = posTheme.spacing.xs,
  align = "center",
  style,
}: PropsWithChildren<{
  maxWidth?: number;
  gap?: number;
  align?: ButtonAlign;
  style?: StyleProp<ViewStyle>;
}>) {
  const { isTablet } = useAdaptiveLayout();

  return (
    <View
      style={[
        styles.centeredActions,
        align === "center" ? styles.centeredActionsCenter : styles.centeredActionsStretch,
        isTablet && align === "center" && { maxWidth },
        { gap },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  centeredActions: {
    width: "100%",
  },
  centeredActionsCenter: {
    alignSelf: "center",
  },
  centeredActionsStretch: {
    alignSelf: "stretch",
  },
});
