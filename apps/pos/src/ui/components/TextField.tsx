import { StyleSheet, Text, TextInput, View } from "react-native";
import { posTheme } from "@/ui/theme";

export function TextField({
  label,
  value,
  onChangeText,
  placeholder,
  help,
  error,
  secureTextEntry,
  keyboardType,
  editable = true,
  testID,
}: {
  label?: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  help?: string;
  error?: string;
  secureTextEntry?: boolean;
  keyboardType?: "default" | "email-address" | "number-pad" | "decimal-pad" | "phone-pad";
  editable?: boolean;
  testID?: string;
}) {
  return (
    <View style={styles.fieldWrap}>
      {label ? <Text style={styles.fieldLabel}>{label}</Text> : null}
      <TextInput
        testID={testID}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={posTheme.colors.textMuted}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        editable={editable}
        style={[styles.fieldInput, error && styles.fieldInputError]}
      />
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
  fieldInput: {
    minHeight: 50,
    borderRadius: posTheme.radius.md,
    borderWidth: 1,
    borderColor: posTheme.colors.border,
    backgroundColor: posTheme.colors.surface,
    paddingHorizontal: posTheme.spacing.md,
    color: posTheme.colors.text,
    fontSize: 16,
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
});
