import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { SyncStatusPill } from "@/ui/components/SyncStatusPill";
import { posTheme } from "@/ui/theme";

export function TopBar({
  title,
  subtitle,
  onBack,
  right,
}: {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  right?: ReactNode;
}) {
  const { t } = useTranslation();

  return (
    <View style={styles.topBar}>
      <View style={styles.topBarLeft}>
        {onBack ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("common.back")}
            style={styles.iconButton}
            onPress={onBack}
          >
            <Ionicons name="arrow-back" size={20} color={posTheme.colors.text} />
          </Pressable>
        ) : null}
        <View>
          <Text style={styles.topBarTitle}>{title}</Text>
          {subtitle ? <Text style={styles.topBarSubtitle}>{subtitle}</Text> : null}
        </View>
      </View>
      <View style={styles.topBarRight}>{right ?? <SyncStatusPill />}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  topBar: {
    minHeight: 60,
    paddingBottom: posTheme.spacing.xs,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: posTheme.spacing.sm,
  },
  topBarLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: posTheme.spacing.sm,
    flexShrink: 1,
  },
  topBarRight: {
    alignItems: "flex-end",
  },
  iconButton: {
    width: 42,
    height: 42,
    borderRadius: posTheme.radius.md,
    borderWidth: 1,
    borderColor: posTheme.colors.border,
    backgroundColor: posTheme.colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  topBarTitle: {
    color: posTheme.colors.text,
    fontSize: 22,
    fontWeight: "800",
  },
  topBarSubtitle: {
    marginTop: 2,
    color: posTheme.colors.textMuted,
    fontSize: 13,
  },
});
