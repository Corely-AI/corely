import type { PropsWithChildren, ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { useAdaptiveLayout } from "@/hooks/useAdaptiveLayout";
import { AppScreen } from "@/ui/components/AppScreen";
import { TopBar } from "@/ui/components/TopBar";
import { posTheme } from "@/ui/theme";

export function AppShell({
  title,
  subtitle,
  onBack,
  right,
  children,
  maxWidth = 1240,
}: PropsWithChildren<{
  title: string;
  subtitle?: string;
  onBack?: () => void;
  right?: ReactNode;
  maxWidth?: number;
}>) {
  const { isTablet } = useAdaptiveLayout();

  return (
    <AppScreen maxWidth={maxWidth} padded={false}>
      <View
        style={[styles.shellInner, isTablet ? styles.shellInnerTablet : styles.shellInnerPhone]}
      >
        <TopBar
          title={title}
          {...(subtitle ? { subtitle } : {})}
          {...(onBack ? { onBack } : {})}
          {...(right ? { right } : {})}
        />
        <View style={styles.shellBody}>{children}</View>
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  shellInner: {
    flex: 1,
  },
  shellInnerPhone: {
    paddingHorizontal: posTheme.spacing.md,
    paddingTop: posTheme.spacing.sm,
    paddingBottom: posTheme.spacing.xs,
  },
  shellInnerTablet: {
    paddingHorizontal: posTheme.spacing.lg,
    paddingTop: posTheme.spacing.md,
    paddingBottom: posTheme.spacing.sm,
  },
  shellBody: {
    flex: 1,
    gap: posTheme.spacing.sm,
  },
});
