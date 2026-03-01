import React, { useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@corely/ui";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@corely/ui";
import { Skeleton } from "@corely/web-shared/shared/components/Skeleton";
import { cn } from "@corely/web-shared/shared/lib/utils";
import { Badge } from "@corely/ui";
import { useVatPeriodsQuery } from "../hooks/useVatPeriodsQuery";
import type { VatPeriodItem } from "@corely/contracts";

interface VatPeriodNavigatorProps {
  year: number;
  onYearChange: (year: number) => void;
  selectedPeriodKey?: string;
  onSelectPeriod: (periodKey: string) => void;
  entityId?: string;
}

export const VatPeriodNavigator = ({
  year,
  onYearChange,
  selectedPeriodKey,
  onSelectPeriod,
  entityId,
}: VatPeriodNavigatorProps) => {
  const navigate = useNavigate();
  const { data, isLoading, isError, refetch } = useVatPeriodsQuery({ year, entityId }, true);

  // Default selection logic
  useEffect(() => {
    if (!data?.periods.length) {
      return;
    }
    if (selectedPeriodKey) {
      // Validation: verify selected key belongs to loaded periods?
      // Not strictly necessary, but good UX.
      return;
    }

    // Find latest existing filing to select by default
    // We reverse to find the latest chronologically that has a filing
    const existing = [...data.periods].reverse().find((p) => p.filingId);
    if (existing) {
      onSelectPeriod(existing.periodKey);
      return;
    }

    const now = new Date();
    const inYear = year === now.getUTCFullYear();
    if (inYear) {
      const current = data.periods.find((p) => new Date(p.from) <= now && new Date(p.to) > now);
      if (current) {
        onSelectPeriod(current.periodKey);
        return;
      }
      const nextDue = data.periods.find((p) => p.dueDate && new Date(p.dueDate) > now);
      if (nextDue) {
        onSelectPeriod(nextDue.periodKey);
        return;
      }
    }

    const last = data.periods[data.periods.length - 1];
    if (last) {
      onSelectPeriod(last.periodKey);
    }
  }, [data, selectedPeriodKey, onSelectPeriod, year]);

  const currentYear = new Date().getFullYear();
  // Show next year + past 5 years
  const yearOptions = Array.from({ length: 6 }, (_, i) => currentYear - i + 1);

  const periods = data?.periods ?? [];
  const selectedPeriod = periods.find((p) => p.periodKey === selectedPeriodKey);

  const statusLabel = useMemo(
    () =>
      ({
        draft: "Draft",
        needsFix: "Needs attention",
        readyForReview: "Ready",
        submitted: "Submitted",
        paid: "Paid",
        archived: "Archived",
      }) as const,
    []
  );

  const getStatusStyles = (status: VatPeriodItem["status"]) => {
    if (status === "submitted") {
      return "bg-green-100 text-green-700 hover:bg-green-100";
    }
    if (status === "needsFix") {
      return "bg-red-100 text-red-700 hover:bg-red-100";
    }
    if (status === "paid") {
      return "bg-blue-100 text-blue-700 hover:bg-blue-100";
    }
    if (status === "archived") {
      return "bg-gray-200 text-gray-700 hover:bg-gray-200";
    }
    return "bg-muted text-muted-foreground";
  };

  const handlePeriodClick = (period: VatPeriodItem) => {
    onSelectPeriod(period.periodKey);
    if (period.filingId) {
      navigate(`/tax/filings/${period.filingId}`);
      return;
    }
    navigate(`/tax/filings/new?type=vat&periodKey=${period.periodKey}&year=${year}`);
  };

  if (isLoading) {
    return (
      <div className="space-y-3" data-testid="vat-period-navigator-loading">
        <Skeleton className="h-8 w-48" />
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 6 }).map((_, idx) => (
            <Skeleton key={idx} className="h-9 w-16" />
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-center justify-between rounded-md border border-border bg-muted/30 px-4 py-3 text-sm">
        <span className="text-muted-foreground">Failed to load VAT periods.</span>
        <Button size="sm" variant="outline" onClick={() => refetch()}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3" data-testid="vat-period-navigator">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onYearChange(year - 1)}
          aria-label="Previous year"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Select value={String(year)} onValueChange={(v) => onYearChange(Number(v))}>
          <SelectTrigger className="w-[120px] h-8 bg-background">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {yearOptions.map((y) => (
              <SelectItem key={y} value={String(y)}>
                {y}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onYearChange(year + 1)}
          aria-label="Next year"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {periods.map((period) => {
          const isSelected = selectedPeriodKey === period.periodKey;
          const hasFiling = !!period.filingId;
          const status = period.status;

          return (
            <button
              key={period.periodKey}
              type="button"
              onClick={() => handlePeriodClick(period)}
              className={cn(
                "flex items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors",
                isSelected
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-background hover:bg-muted/40",
                !hasFiling && "border-dashed text-muted-foreground"
              )}
            >
              <span className="font-medium">{period.label}</span>
              {status ? (
                <Badge
                  variant="secondary"
                  className={cn("text-[10px] h-4 px-1 rounded-sm", getStatusStyles(status))}
                >
                  {statusLabel[status] ?? "Draft"}
                </Badge>
              ) : (
                <span className="text-[10px] text-muted-foreground">Not started</span>
              )}
            </button>
          );
        })}
      </div>

      {selectedPeriodKey && selectedPeriod && !selectedPeriod.filingId ? (
        <div className="flex items-center justify-between rounded-md border border-border bg-muted/30 px-4 py-3 text-sm">
          <span className="text-muted-foreground">
            No filing yet for {selectedPeriod.label} {year}.
          </span>
          <Button
            size="sm"
            onClick={() =>
              navigate(`/tax/filings/new?type=vat&periodKey=${selectedPeriodKey}&year=${year}`)
            }
          >
            Create filing
          </Button>
        </div>
      ) : null}
    </div>
  );
};
