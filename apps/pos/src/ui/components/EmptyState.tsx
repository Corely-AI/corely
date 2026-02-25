import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { BUTTON_MAX_WIDTH_COMPACT, Button } from "@/ui/components/Button";
import { Card } from "@/ui/components/Card";
import { CenteredActions } from "@/ui/components/CenteredActions";
import { posTheme } from "@/ui/theme";

export function EmptyState({
  icon,
  title,
  description,
  primaryAction,
  secondaryAction,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  primaryAction?: { label: string; onPress: () => void; testID?: string };
  secondaryAction?: { label: string; onPress: () => void; testID?: string };
}) {
  return (
    <Card>
      <View style={styles.emptyState}>
        {icon ? <View style={styles.emptyStateIcon}>{icon}</View> : null}
        <Text style={styles.emptyStateTitle}>{title}</Text>
        {description ? <Text style={styles.emptyStateDesc}>{description}</Text> : null}
        <CenteredActions maxWidth={BUTTON_MAX_WIDTH_COMPACT} style={styles.emptyStateActions}>
          {primaryAction ? (
            <Button
              label={primaryAction.label}
              onPress={primaryAction.onPress}
              {...(primaryAction.testID ? { testID: primaryAction.testID } : {})}
            />
          ) : null}
          {secondaryAction ? (
            <Button
              label={secondaryAction.label}
              onPress={secondaryAction.onPress}
              variant="ghost"
              {...(secondaryAction.testID ? { testID: secondaryAction.testID } : {})}
            />
          ) : null}
        </CenteredActions>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    gap: posTheme.spacing.xs,
    paddingVertical: posTheme.spacing.lg,
    paddingHorizontal: posTheme.spacing.md,
  },
  emptyStateIcon: {
    marginBottom: 4,
  },
  emptyStateTitle: {
    color: posTheme.colors.text,
    fontSize: 21,
    fontWeight: "800",
    textAlign: "center",
  },
  emptyStateDesc: {
    color: posTheme.colors.textMuted,
    textAlign: "center",
  },
  emptyStateActions: {
    marginTop: posTheme.spacing.sm,
  },
});
