import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { posTheme } from "@/ui/theme";

export function Snackbar({
  message,
  tone = "info",
}: {
  message: string;
  tone?: "info" | "success" | "warning" | "danger";
}) {
  const iconName =
    tone === "success"
      ? "checkmark-circle-outline"
      : tone === "warning"
        ? "alert-circle-outline"
        : tone === "danger"
          ? "warning-outline"
          : "information-circle-outline";

  return (
    <View
      style={[
        styles.snackbar,
        tone === "info" && styles.snackbarInfo,
        tone === "success" && styles.snackbarSuccess,
        tone === "warning" && styles.snackbarWarning,
        tone === "danger" && styles.snackbarDanger,
      ]}
    >
      <Ionicons
        name={iconName}
        size={16}
        color={tone === "warning" ? posTheme.colors.text : posTheme.colors.white}
      />
      <Text style={[styles.snackbarText, tone === "warning" && styles.snackbarTextDark]}>
        {message}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  snackbar: {
    borderRadius: posTheme.radius.md,
    paddingVertical: 10,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  snackbarText: {
    color: posTheme.colors.white,
    fontWeight: "700",
  },
  snackbarTextDark: {
    color: posTheme.colors.text,
  },
  snackbarInfo: {
    backgroundColor: posTheme.colors.info,
  },
  snackbarSuccess: {
    backgroundColor: posTheme.colors.success,
  },
  snackbarWarning: {
    backgroundColor: posTheme.colors.snackbarWarningBg,
  },
  snackbarDanger: {
    backgroundColor: posTheme.colors.danger,
  },
});
