import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { Card } from "@/ui/components/Card";
import { posTheme } from "@/ui/theme";

export function NumericKeypad({
  onKey,
  onBackspace,
  onClear,
}: {
  onKey: (key: string) => void;
  onBackspace: () => void;
  onClear: () => void;
}) {
  const { t } = useTranslation();
  const rows = [
    ["1", "2", "3"],
    ["4", "5", "6"],
    ["7", "8", "9"],
    [".", "0", "back"],
  ] as const;

  return (
    <Card>
      <View style={styles.keypadHeader}>
        <Text style={styles.keypadTitle}>{t("common.keypad")}</Text>
        <Pressable onPress={onClear} style={styles.keypadClearBtn}>
          <Text style={styles.keypadClearText}>{t("common.clear")}</Text>
        </Pressable>
      </View>
      <View style={styles.keypadGrid}>
        {rows.flat().map((key) => (
          <Pressable
            key={key}
            style={styles.keypadKey}
            onPress={() => {
              if (key === "back") {
                onBackspace();
              } else {
                onKey(key);
              }
            }}
          >
            {key === "back" ? (
              <Ionicons name="backspace-outline" size={20} color={posTheme.colors.text} />
            ) : (
              <Text style={styles.keypadKeyText}>{key}</Text>
            )}
          </Pressable>
        ))}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  keypadHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: posTheme.spacing.sm,
  },
  keypadTitle: {
    color: posTheme.colors.text,
    fontWeight: "800",
  },
  keypadClearBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  keypadClearText: {
    color: posTheme.colors.primary,
    fontWeight: "700",
  },
  keypadGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: posTheme.spacing.xs,
  },
  keypadKey: {
    width: "31%",
    minHeight: 52,
    borderRadius: posTheme.radius.md,
    borderWidth: 1,
    borderColor: posTheme.colors.border,
    backgroundColor: posTheme.colors.surfaceMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  keypadKeyText: {
    color: posTheme.colors.text,
    fontWeight: "800",
    fontSize: 19,
  },
});
