import { StyleSheet, Text, TextInput, View } from "react-native";
import { posTheme } from "@/ui/theme";

export function MoneyInput({
  label,
  value,
  onChange,
  help,
  error,
  testID,
  prefix = "$",
}: {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  help?: string;
  error?: string;
  testID?: string;
  prefix?: string;
}) {
  return (
    <View style={styles.fieldWrap}>
      {label ? <Text style={styles.fieldLabel}>{label}</Text> : null}
      <View style={[styles.moneyWrap, error && styles.fieldInputError]}>
        <Text style={styles.moneyPrefix}>{prefix}</Text>
        <TextInput
          testID={testID}
          value={value}
          onChangeText={onChange}
          keyboardType="decimal-pad"
          placeholder="0.00"
          placeholderTextColor={posTheme.colors.textMuted}
          style={styles.moneyInput}
        />
      </View>
      {error ? (
        <Text style={styles.fieldError}>{error}</Text>
      ) : help ? (
        <Text style={styles.fieldHelp}>{help}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  fieldWrap: {
    gap: 6,
  },
  fieldLabel: {
    color: posTheme.colors.textMuted,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.2,
    textTransform: "uppercase",
  },
  fieldInputError: {
    borderColor: posTheme.colors.danger,
  },
  fieldHelp: {
    color: posTheme.colors.textMuted,
    fontSize: 12,
  },
  fieldError: {
    color: posTheme.colors.danger,
    fontSize: 12,
    fontWeight: "600",
  },
  moneyWrap: {
    minHeight: 52,
    borderRadius: posTheme.radius.md,
    borderWidth: 1,
    borderColor: posTheme.colors.border,
    backgroundColor: posTheme.colors.surface,
    paddingHorizontal: posTheme.spacing.md,
    flexDirection: "row",
    alignItems: "center",
  },
  moneyPrefix: {
    color: posTheme.colors.textMuted,
    fontSize: 20,
    fontWeight: "800",
    marginRight: 8,
  },
  moneyInput: {
    flex: 1,
    color: posTheme.colors.text,
    fontSize: 24,
    fontWeight: "800",
  },
});
