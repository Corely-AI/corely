import { Pressable, StyleSheet, Text, View } from "react-native";
import { posTheme } from "@/ui/theme";

export function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: Array<{ value: T; label: string; count?: number }>;
  onChange: (value: T) => void;
}) {
  return (
    <View style={styles.segmentWrap}>
      {options.map((option) => {
        const active = option.value === value;
        return (
          <Pressable
            key={option.value}
            style={[styles.segmentItem, active && styles.segmentItemActive]}
            onPress={() => onChange(option.value)}
          >
            <Text style={[styles.segmentLabel, active && styles.segmentLabelActive]}>
              {option.label}
              {typeof option.count === "number" ? ` (${option.count})` : ""}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  segmentWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    padding: 4,
    borderRadius: posTheme.radius.lg,
    backgroundColor: posTheme.colors.surfaceMuted,
    gap: 6,
  },
  segmentItem: {
    borderRadius: posTheme.radius.md,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  segmentItemActive: {
    backgroundColor: posTheme.colors.surface,
    borderWidth: 1,
    borderColor: posTheme.colors.primary,
  },
  segmentLabel: {
    color: posTheme.colors.textMuted,
    fontWeight: "700",
    fontSize: 13,
  },
  segmentLabelActive: {
    color: posTheme.colors.primary,
  },
});
