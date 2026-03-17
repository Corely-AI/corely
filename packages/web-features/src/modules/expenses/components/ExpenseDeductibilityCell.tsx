import type { ExpenseDto } from "@corely/contracts";
import { Badge } from "@corely/ui";
import { useTranslation } from "react-i18next";

type ExpenseDeductibilityCellProps = {
  expense: ExpenseDto;
};

export function ExpenseDeductibilityCell({ expense }: ExpenseDeductibilityCellProps) {
  const { t } = useTranslation();
  const deductibility = expense.deductibility;

  if (!deductibility || deductibility.deductiblePercent == null) {
    const kind = deductibility?.ruleKind;
    if (kind === "PER_DIEM") {
      return <Badge variant="muted">{t("expenses.list.ruleKind.perDiem")}</Badge>;
    }
    if (kind === "MIXED_USE") {
      return <Badge variant="muted">{t("expenses.list.ruleKind.mixedUse")}</Badge>;
    }
    if (kind === "GIFT_THRESHOLD_PER_RECIPIENT_YEAR") {
      return <Badge variant="muted">{t("expenses.list.ruleKind.gift")}</Badge>;
    }
    return <span className="text-muted-foreground text-sm">—</span>;
  }

  const pct = deductibility.deductiblePercent;
  const tone = pct === 100 ? "text-green-700" : pct === 0 ? "text-red-600" : "text-amber-700";

  return <span className={`text-xs font-semibold ${tone}`}>{pct}%</span>;
}
