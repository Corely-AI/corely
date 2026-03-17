import React from "react";
import type { VatPeriodSummaryDto } from "@corely/contracts";
import { Badge } from "@corely/ui";
import { formatMoney } from "@corely/web-shared/shared/lib/formatters";
import { formatDateRange, formatPeriodLabel, statusVariant } from "./utils";

import { useTranslation } from "react-i18next";

export function PeriodList({
  periods,
  selectedKey,
  onSelect,
  locale,
}: {
  periods: VatPeriodSummaryDto[];
  selectedKey: string | null;
  onSelect: (key: string) => void;
  locale?: string;
}) {
  const { t } = useTranslation();
  if (periods.length === 0) {
    return <p className="text-sm text-muted-foreground">{t("tax.history.noPeriods")}</p>;
  }

  return (
    <div className="space-y-3">
      {periods.map((period) => (
        <div
          key={period.periodKey}
          onClick={() => onSelect(period.periodKey)}
          className={`flex items-center justify-between rounded-lg border p-3 transition-colors ${
            selectedKey === period.periodKey
              ? "border-primary/70 bg-primary/5"
              : "hover:bg-muted/50"
          }`}
        >
          <div>
            <div className="font-medium text-primary">{formatPeriodLabel(period)}</div>
            <div className="text-sm text-muted-foreground">
              {formatDateRange(period.periodStart, period.periodEnd, locale)}
            </div>
          </div>
          <div className="space-y-1 text-right">
            <div className="font-semibold">{formatMoney(period.taxDueCents, locale)}</div>
            <Badge variant={statusVariant(period.status)}>{period.status}</Badge>
          </div>
        </div>
      ))}
    </div>
  );
}
