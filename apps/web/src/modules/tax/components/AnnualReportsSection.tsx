import React from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import { formatMoney } from "@/shared/lib/formatters";
import { HelpCircle, Pencil, ArrowRight, Loader2 } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { type TaxReportDto } from "@corely/contracts";

interface AnnualReportsSectionProps {
  reports: TaxReportDto[];
  isLoading: boolean;
  locale: string;
}

export function AnnualReportsSection({ reports, isLoading, locale }: AnnualReportsSectionProps) {
  const navigate = useNavigate();

  // We want to show the current year and maybe previous years if they are open
  // Or just render whatever reports come in that are "ANNUAL_REPORT" group
  // Sorting by period start descending is usually good (newest first)
  const sortedReports = [...reports].sort(
    (a, b) => new Date(b.periodStart).getTime() - new Date(a.periodStart).getTime()
  );

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-semibold text-foreground/80">Annual Reports</h2>
            <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
          </div>
          <div>
            <Button
              variant="link"
              className="h-auto p-0 text-xs text-muted-foreground hover:text-primary"
              onClick={() => navigate("/tax/settings")}
            >
              SETTINGS
              <Pencil className="ml-1 h-3 w-3" />
            </Button>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card className="h-64 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground/30" />
          </Card>
        </div>
      ) : sortedReports.length === 0 ? (
        <div className="text-sm text-muted-foreground italic">No annual reports scheduled yet.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sortedReports.map((report) => (
            <AnnualReportCard key={report.id} report={report} locale={locale} />
          ))}
        </div>
      )}
    </div>
  );
}

function AnnualReportCard({ report, locale }: { report: TaxReportDto; locale: string }) {
  const navigate = useNavigate();

  // Determine status styling
  const status = report.status;
  const isSubmitted = status === "SUBMITTED" || status === "PAID" || status === "ARCHIVED";
  const isOpen = status === "OPEN" || status === "OVERDUE";
  const isUpcoming = status === "UPCOMING";

  // "Year in Progress" logic: if it's upcoming and covers current date?
  // For simplicity, map UPCOMING to "YEAR IN PROGRESS" visually if it's future/current
  // But let's stick to status text for now, maybe mapping it.

  let badgeText = status.replace(/_/g, " ");
  let badgeVariant: "default" | "secondary" | "outline" | "destructive" | "success" | "warning" =
    "secondary";
  let badgeIcon = null;

  if (isOpen) {
    badgeText = "OPEN FOR SUBMISSION";
    badgeVariant = "default"; // or a specific blue 'info' style if available, default is primary
  } else if (isUpcoming) {
    badgeText = "YEAR IN PROGRESS";
    badgeVariant = "warning"; // using warning for in-progress/pending feel
    badgeIcon = <span className="mr-1">🧘</span>; // Meditating person from screenshot? Or generic icon
  } else if (isSubmitted) {
    badgeVariant = "success";
  }

  const year = new Date(report.periodStart).getFullYear();
  const amount = report.amountFinalCents ?? report.amountEstimatedCents ?? 0;

  return (
    <Card className="overflow-hidden border shadow-sm hover:shadow-md transition-shadow relative flex flex-col items-center text-center">
      {/* Top Badge Area */}
      <div
        className={cn(
          "w-full py-3 flex justify-center items-center text-xs font-semibold tracking-wide uppercase",
          isOpen && "bg-blue-50 text-blue-600",
          isUpcoming && "bg-orange-50 text-orange-600",
          isSubmitted && "bg-green-50 text-green-600",
          !isOpen && !isUpcoming && !isSubmitted && "bg-muted"
        )}
      >
        {badgeIcon} {badgeText}
      </div>

      <CardContent className="flex-1 flex flex-col items-center justify-center p-6 w-full space-y-6">
        <div className="space-y-2">
          <h3 className="text-lg text-muted-foreground font-medium">Year {year}</h3>
          <div className="text-3xl font-bold tracking-tight">{formatMoney(amount, locale)}</div>
          <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
            Estimated tax to pay
          </p>
        </div>

        <div className="w-full pt-2">
          {isOpen ? (
            <Button
              className="w-40 rounded-full bg-cyan-500 hover:bg-cyan-600 text-white font-medium"
              onClick={() => navigate(`/tax/reports/${report.id}`)}
            >
              Review & Submit
            </Button>
          ) : (
            <Button
              variant="link"
              className="text-cyan-500 hover:text-cyan-600"
              onClick={() => navigate(`/tax/reports/${report.id}`)}
            >
              Preview
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
