import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { posTheme } from "@/ui/theme";

export function ListRow({
  title,
  subtitle,
  right,
  onPress,
  showChevron = false,
}: {
  title: string;
  subtitle?: string;
  right?: ReactNode;
  onPress?: () => void;
  showChevron?: boolean;
}) {
  const content = (
    <View style={styles.listRowInner}>
      <View style={styles.listRowMain}>
        <Text style={styles.listRowTitle}>{title}</Text>
        {subtitle ? <Text style={styles.listRowSubtitle}>{subtitle}</Text> : null}
      </View>
      {right}
      {showChevron ? (
        <Ionicons name="chevron-forward" size={18} color={posTheme.colors.textMuted} />
      ) : null}
    </View>
  );

  if (onPress) {
    return (
      <Pressable style={styles.listRow} onPress={onPress}>
        {content}
      </Pressable>
    );
  }

  return <View style={styles.listRow}>{content}</View>;
}

const styles = StyleSheet.create({
  listRow: {
    borderBottomWidth: 1,
    borderBottomColor: posTheme.colors.border,
    paddingVertical: 12,
  },
  listRowInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  listRowMain: {
    flex: 1,
  },
  listRowTitle: {
    color: posTheme.colors.text,
    fontWeight: "700",
    fontSize: 15,
  },
  listRowSubtitle: {
    color: posTheme.colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
});
