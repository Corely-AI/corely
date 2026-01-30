import React, { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { taxApi } from "@/lib/tax-api";
import { Button } from "@/shared/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { Skeleton } from "@/shared/components/Skeleton";
import { Link, useNavigate } from "react-router-dom";
import { cn } from "@/shared/lib/utils";
import { Badge } from "@/shared/ui/badge";

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
  const { data, isLoading } = useQuery({
    queryKey: ["vat-periods", year, entityId],
    queryFn: () => taxApi.getVatFilingPeriods({ year, entityId }),
  });

  // Default selection logic
  useEffect(() => {
    if (!data?.periods.length) {return;}
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
    } else {
      // If no filings exist, select the period closest to now (or last one)
      // Simple heuristic: select last period of the year
      const last = data.periods[data.periods.length - 1];
      if (last) {onSelectPeriod(last.periodKey);}
    }
  }, [data, selectedPeriodKey, onSelectPeriod]);

  const currentYear = new Date().getFullYear();
  // Show next year + past 5 years
  const yearOptions = Array.from({ length: 6 }, (_, i) => currentYear - i + 1);

  if (isLoading) {return <Skeleton className="h-24 w-full mb-6" />;}

  const selectedPeriod = data?.periods.find((p) => p.periodKey === selectedPeriodKey);

  return (
    <div className="flex flex-col gap-4 p-4 bg-muted/20 rounded-lg mb-6 border">
      <div className="flex items-center gap-4">
        <label className="font-medium text-sm text-muted-foreground">Tax Year:</label>
        <Select value={String(year)} onValueChange={(v) => onYearChange(Number(v))}>
          <SelectTrigger className="w-[120px] bg-background">
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
      </div>

      <div className="flex flex-wrap gap-3">
        {data?.periods.map((period) => {
          const isSelected = selectedPeriodKey === period.periodKey;
          const hasFiling = !!period.filingId;
          const status = period.status;

          return (
            <div key={period.periodKey} className="flex flex-col items-center gap-1">
              <Button
                variant={isSelected ? "default" : "outline"}
                className={cn(
                  "w-20 relative bg-background",
                  isSelected ? "" : "hover:bg-accent hover:text-accent-foreground",
                  !hasFiling && !isSelected && "text-muted-foreground border-dashed"
                )}
                onClick={() => onSelectPeriod(period.periodKey)}
              >
                {period.label}
              </Button>

              {/* Status Dot/Label */}
              {hasFiling ? (
                <Badge
                  variant="secondary"
                  className={cn(
                    "text-[9px] h-4 px-1 rounded-sm",
                    status === "SUBMITTED" && "bg-green-100 text-green-700 hover:bg-green-100",
                    status === "NEEDS_FIX" && "bg-red-100 text-red-700 hover:bg-red-100",
                    status === "PAID" && "bg-blue-100 text-blue-700 hover:bg-blue-100"
                  )}
                >
                  {status?.replace(/_/g, " ") || "Draft"}
                </Badge>
              ) : (
                <span className="text-[10px] text-muted-foreground h-4">
                  {/* Empty spacer or text */}-
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Create Call-to-Action for selected but missing period */}
      {selectedPeriodKey && selectedPeriod && !selectedPeriod.filingId && (
        <div className="mt-2 p-4 bg-background border rounded-md shadow-sm flex items-center justify-between animate-in fade-in slide-in-from-top-2">
          <div>
            <h4 className="font-semibold text-sm">
              No filing for {selectedPeriod.label} {year}
            </h4>
            <p className="text-sm text-muted-foreground">Start working on this period's return.</p>
          </div>
          <Button asChild>
            <Link
              to={`/tax/filings/new?type=VAT&year=${year}&periodKey=${selectedPeriodKey}&entityId=${entityId || ""}&from=tax-filings-list`}
            >
              Create {selectedPeriod.label} Filing
            </Link>
          </Button>
        </div>
      )}
    </div>
  );
};
