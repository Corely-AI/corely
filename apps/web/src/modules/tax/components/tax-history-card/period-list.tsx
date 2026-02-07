import React from "react";
import type { VatPeriodSummaryDto } from "@corely/contracts";
import { Badge } from "@corely/ui";
import { formatMoney } from "@/shared/lib/formatters";
import { formatDateRange, formatPeriodLabel, statusVariant } from "./utils";

export function PeriodList({
  periods,
  selectedKey,
  onSelect,
}: {
  periods: VatPeriodSummaryDto[];
  selectedKey: string | null;
  onSelect: (key: string) => void;
}) {
  if (periods.length === 0) {
    return <p className="text-sm text-muted-foreground">No periods found.</p>;
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
              {formatDateRange(period.periodStart, period.periodEnd)}
            </div>
          </div>
          <div className="space-y-1 text-right">
            <div className="font-semibold">{formatMoney(period.taxDueCents, "EUR")}</div>
            <Badge variant={statusVariant(period.status)}>{period.status}</Badge>
          </div>
        </div>
      ))}
    </div>
  );
}
