import { StyleSheet } from "react-native";
import { posTheme } from "@/ui/theme";

export const styles = StyleSheet.create({
  layout: {
    flex: 1,
    gap: posTheme.spacing.md,
  },
  catalogPane: {
    flex: 1.2,
    gap: posTheme.spacing.sm,
  },
  orderPane: {
    flex: 1,
  },
  listContent: {
    gap: posTheme.spacing.sm,
    paddingVertical: posTheme.spacing.sm,
  },
  productRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: posTheme.spacing.md,
    backgroundColor: posTheme.colors.surface,
    borderRadius: posTheme.radius.lg,
    borderWidth: 1,
    borderColor: posTheme.colors.border,
  },
  productMain: {
    flex: 1,
    gap: 2,
  },
  productName: {
    color: posTheme.colors.text,
    fontWeight: "700",
  },
  productMeta: {
    color: posTheme.colors.textMuted,
    fontSize: 12,
  },
  productPrice: {
    color: posTheme.colors.text,
    fontWeight: "700",
  },
  sectionTitle: {
    color: posTheme.colors.text,
    fontSize: 16,
    fontWeight: "700",
    marginBottom: posTheme.spacing.sm,
  },
  emptyWrap: {
    flex: 1,
    justifyContent: "center",
  },
  emptyHint: {
    color: posTheme.colors.textMuted,
    marginBottom: posTheme.spacing.md,
  },
  orderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: posTheme.spacing.sm,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: posTheme.colors.border,
  },
  orderMain: {
    flex: 1,
    gap: 4,
  },
  orderName: {
    color: posTheme.colors.text,
    fontWeight: "700",
  },
  orderMeta: {
    color: posTheme.colors.textMuted,
    fontSize: 12,
  },
  qtyCluster: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  qtyText: {
    minWidth: 20,
    color: posTheme.colors.text,
    textAlign: "center",
    fontWeight: "700",
  },
  summaryBlock: {
    marginTop: posTheme.spacing.md,
    gap: 8,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  actionRow: {
    flexDirection: "row",
    gap: posTheme.spacing.sm,
    marginTop: posTheme.spacing.md,
  },
  modalBody: {
    gap: posTheme.spacing.md,
  },
  modifierGroup: {
    gap: posTheme.spacing.sm,
  },
  optionRow: {
    padding: posTheme.spacing.md,
    borderRadius: posTheme.radius.lg,
    backgroundColor: posTheme.colors.surface,
    borderWidth: 1,
    borderColor: posTheme.colors.border,
  },
  optionRowSelected: {
    backgroundColor: posTheme.colors.primaryMuted,
  },
});
