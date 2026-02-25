import { StyleSheet, Text, View } from "react-native";
import { posTheme } from "@/ui/theme";

export function Badge({
  label,
  tone = "neutral",
}: {
  label: string;
  tone?: "neutral" | "success" | "danger" | "warning" | "info";
}) {
  return (
    <View
      style={[
        styles.badge,
        tone === "neutral" && styles.badgeNeutral,
        tone === "success" && styles.badgeSuccess,
        tone === "danger" && styles.badgeDanger,
        tone === "warning" && styles.badgeWarning,
        tone === "info" && styles.badgeInfo,
      ]}
    >
      <Text style={styles.badgeText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: posTheme.radius.pill,
    alignSelf: "flex-start",
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "800",
    color: posTheme.colors.text,
  },
  badgeNeutral: {
    backgroundColor: posTheme.colors.surfaceMuted,
  },
  badgeSuccess: {
    backgroundColor: posTheme.colors.statusSuccessSoft,
  },
  badgeDanger: {
    backgroundColor: posTheme.colors.statusDangerSoft,
  },
  badgeWarning: {
    backgroundColor: posTheme.colors.statusWarningSoft,
  },
  badgeInfo: {
    backgroundColor: posTheme.colors.statusInfoSoft,
  },
});
