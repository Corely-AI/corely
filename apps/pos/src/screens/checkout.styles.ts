import { StyleSheet } from "react-native";
import { posTheme } from "@/ui/theme";

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: posTheme.spacing.md,
  },
  containerTablet: {
    flexDirection: "row",
    alignItems: "stretch",
  },
  mainPane: {
    flex: 1.35,
  },
  sidePane: {
    flex: 1,
    gap: posTheme.spacing.md,
    maxWidth: 360,
  },
  scrollBody: {
    gap: posTheme.spacing.md,
    paddingBottom: posTheme.spacing.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: posTheme.colors.text,
    marginBottom: posTheme.spacing.sm,
  },
  summaryToggle: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderRadius: posTheme.radius.md,
    borderWidth: 1,
    borderColor: posTheme.colors.border,
    backgroundColor: posTheme.colors.surface,
    paddingHorizontal: posTheme.spacing.sm,
    minHeight: 44,
  },
  summaryToggleText: {
    color: posTheme.colors.primary,
    fontWeight: "800",
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  summaryLabel: {
    color: posTheme.colors.textMuted,
  },
  summaryValue: {
    color: posTheme.colors.text,
    fontWeight: "700",
  },
  summaryGrand: {
    borderTopWidth: 1,
    borderTopColor: posTheme.colors.border,
    paddingTop: 10,
    marginTop: 8,
    marginBottom: 10,
  },
  grandLabel: {
    color: posTheme.colors.text,
    fontWeight: "900",
    fontSize: 17,
  },
  grandValue: {
    color: posTheme.colors.primary,
    fontWeight: "900",
    fontSize: 22,
  },
  paymentState: {
    marginTop: posTheme.spacing.sm,
    flexDirection: "row",
    justifyContent: "space-between",
    padding: posTheme.spacing.sm,
    borderRadius: posTheme.radius.md,
    backgroundColor: posTheme.colors.surfaceMuted,
    marginBottom: posTheme.spacing.sm,
  },
  stateLabel: {
    color: posTheme.colors.textMuted,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  stateValue: {
    marginTop: 2,
    color: posTheme.colors.text,
    fontSize: 20,
    fontWeight: "900",
  },
  changePositive: {
    color: posTheme.colors.success,
  },
  paymentActions: {
    marginTop: posTheme.spacing.sm,
    gap: posTheme.spacing.xs,
  },
  cashQuickRow: {
    marginTop: posTheme.spacing.sm,
    flexDirection: "row",
    gap: posTheme.spacing.xs,
    flexWrap: "wrap",
  },
  quickChip: {
    borderRadius: posTheme.radius.pill,
    borderWidth: 1,
    borderColor: posTheme.colors.primary,
    backgroundColor: posTheme.colors.primaryMuted,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  quickChipText: {
    color: posTheme.colors.primary,
    fontWeight: "800",
  },
  paymentList: {
    marginTop: posTheme.spacing.sm,
    gap: 8,
  },
  paymentRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: posTheme.colors.border,
    backgroundColor: posTheme.colors.surfaceMuted,
    borderRadius: posTheme.radius.md,
    paddingHorizontal: posTheme.spacing.sm,
    paddingVertical: posTheme.spacing.xs,
  },
  paymentRowMain: {
    flex: 1,
  },
  paymentLabel: {
    color: posTheme.colors.text,
    fontWeight: "700",
  },
  paymentSub: {
    color: posTheme.colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  paymentRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: posTheme.spacing.xs,
  },
  paymentAmount: {
    color: posTheme.colors.text,
    fontWeight: "800",
  },
  footer: {
    marginTop: posTheme.spacing.xs,
  },
});
