import type { ReactNode } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { useAdaptiveLayout } from "@/hooks/useAdaptiveLayout";
import { posTheme } from "@/ui/theme";

export const BUTTON_MAX_WIDTH = 520;
export const BUTTON_MAX_WIDTH_COMPACT = 360;

export type ButtonVariant = "primary" | "secondary" | "ghost" | "destructive" | "danger";
export type ButtonAlign = "center" | "stretch";
export type ButtonSize = "md" | "lg";

export function Button({
  label,
  onPress,
  variant = "primary",
  disabled,
  loading,
  leftIcon,
  testID,
  accessibilityLabel,
  fullWidth = false,
  maxWidth = BUTTON_MAX_WIDTH,
  align = "center",
  size = "md",
  labelLines = 2,
}: {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  loading?: boolean;
  leftIcon?: ReactNode;
  testID?: string;
  accessibilityLabel?: string;
  fullWidth?: boolean;
  maxWidth?: number;
  align?: ButtonAlign;
  size?: ButtonSize;
  labelLines?: 1 | 2;
}) {
  const { isTablet } = useAdaptiveLayout();
  const tone = variant === "danger" ? "destructive" : variant;
  const constrainOnTablet = !fullWidth && align === "center" && isTablet;

  return (
    <View
      style={[
        styles.buttonContainer,
        align === "center" ? styles.buttonContainerCenter : styles.buttonContainerStretch,
        constrainOnTablet && { maxWidth },
      ]}
    >
      <Pressable
        testID={testID}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? label}
        disabled={disabled || loading}
        onPress={onPress}
        style={({ pressed }) => [
          styles.button,
          align === "stretch" && styles.buttonInline,
          size === "lg" ? styles.buttonLg : styles.buttonMd,
          tone === "primary" && styles.buttonPrimary,
          tone === "secondary" && styles.buttonSecondary,
          tone === "ghost" && styles.buttonGhost,
          tone === "destructive" && styles.buttonDestructive,
          pressed && !(disabled || loading) && styles.buttonPressed,
          (disabled || loading) && styles.buttonDisabled,
        ]}
      >
        {loading ? (
          <ActivityIndicator
            color={
              tone === "secondary" || tone === "ghost"
                ? posTheme.colors.primary
                : posTheme.colors.white
            }
          />
        ) : null}
        {!loading && leftIcon ? <View style={styles.buttonIcon}>{leftIcon}</View> : null}
        {!loading ? (
          <Text
            numberOfLines={labelLines}
            ellipsizeMode="tail"
            style={[
              styles.buttonText,
              tone === "secondary" || tone === "ghost"
                ? styles.buttonTextSecondary
                : styles.buttonTextPrimary,
            ]}
          >
            {label}
          </Text>
        ) : null}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: posTheme.radius.md,
    paddingHorizontal: posTheme.spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
  },
  buttonInline: {
    width: "auto",
    alignSelf: "flex-start",
  },
  buttonContainer: {
    minWidth: 0,
  },
  buttonContainerCenter: {
    alignSelf: "center",
    width: "100%",
  },
  buttonContainerStretch: {
    alignSelf: "stretch",
    width: "auto",
  },
  buttonMd: {
    minHeight: 48,
  },
  buttonLg: {
    minHeight: 56,
    paddingHorizontal: posTheme.spacing.lg,
  },
  buttonPrimary: {
    backgroundColor: posTheme.colors.primary,
  },
  buttonSecondary: {
    borderWidth: 1,
    borderColor: posTheme.colors.primary,
    backgroundColor: posTheme.colors.primaryMuted,
  },
  buttonGhost: {
    borderWidth: 1,
    borderColor: posTheme.colors.border,
    backgroundColor: posTheme.colors.surface,
  },
  buttonDestructive: {
    backgroundColor: posTheme.colors.danger,
  },
  buttonPressed: {
    transform: [{ scale: 0.98 }],
  },
  buttonDisabled: {
    opacity: 0.45,
  },
  buttonIcon: {
    marginRight: 8,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "800",
    textAlign: "center",
    lineHeight: 20,
  },
  buttonTextPrimary: {
    color: posTheme.colors.white,
  },
  buttonTextSecondary: {
    color: posTheme.colors.primary,
  },
});
