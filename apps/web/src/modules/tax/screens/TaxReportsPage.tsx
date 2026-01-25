import React from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { taxApi } from "@/lib/tax-api";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/shared/ui/tabs";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { formatMoney, formatDueDate } from "@/shared/lib/formatters";
import { CheckCircle2, Clock, Download, FileText, FileSignature } from "lucide-react";
import { toast } from "sonner";

export default function TaxReportsPage() {
  const [tab, setTab] = React.useState<"upcoming" | "submitted">("upcoming");
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["tax-reports", tab],
    queryFn: () => taxApi.listReports(tab),
  });

  const markSubmitted = useMutation({
    mutationFn: async (id: string) => taxApi.markReportSubmitted(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["tax-reports"] });
    },
  });

  const locale = "de-DE";

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Tax Reports</h1>
          <p className="text-muted-foreground">Track upcoming declarations and submissions.</p>
        </div>
      </div>

      <Tabs value={tab} onValueChange={(val) => setTab(val as "upcoming" | "submitted")}>
        <TabsList>
          <TabsTrigger value="upcoming">Upcoming reports</TabsTrigger>
          <TabsTrigger value="submitted">Submitted</TabsTrigger>
        </TabsList>
        <TabsContent value="upcoming">
          <ReportGroup
            title="Advance VAT declarations"
            icon={<Clock className="h-4 w-4 text-primary" />}
            isLoading={isLoading}
            reports={data?.reports?.filter((r) => r.group === "ADVANCE_VAT") ?? []}
            locale={locale}
            onSubmit={(id) => markSubmitted.mutate(id)}
            canSubmit
          />
          <ReportGroup
            title="Compliance (EU Sales & Intrastat)"
            icon={<FileText className="h-4 w-4 text-blue-500" />}
            isLoading={isLoading}
            reports={data?.reports?.filter((r) => r.group === "COMPLIANCE") ?? []}
            locale={locale}
            onSubmit={(id) => markSubmitted.mutate(id)}
            canSubmit
          />
          <ReportGroup
            title="Annual reports"
            icon={<FileSignature className="h-4 w-4 text-muted-foreground" />}
            isLoading={isLoading}
            reports={data?.reports?.filter((r) => r.group === "ANNUAL_REPORT") ?? []}
            locale={locale}
            onSubmit={(id) => markSubmitted.mutate(id)}
            canSubmit
          />
        </TabsContent>
        <TabsContent value="submitted">
          <ReportGroup
            title="Submitted reports"
            icon={<CheckCircle2 className="h-4 w-4 text-success" />}
            isLoading={isLoading}
            reports={data?.reports ?? []}
            locale={locale}
            onSubmit={() => {}}
            canSubmit={false}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

interface ReportGroupProps {
  title: string;
  icon: React.ReactNode;
  reports: any[];
  isLoading: boolean;
  locale: string;
  onSubmit: (id: string) => void;
  canSubmit: boolean;
}

function ReportGroup({
  title,
  icon,
  reports,
  isLoading,
  locale,
  onSubmit,
  canSubmit,
}: ReportGroupProps) {
  const navigate = useNavigate();

  const handleDownload = (id: string) => {
    const promise = taxApi.getReportPdfUrl(id).then((res) => {
      window.open(res.downloadUrl, "_blank", "noopener,noreferrer");
    });

    toast.promise(promise, {
      loading: "Generating PDF...",
      success: "Download started",
      error: "Failed to download PDF",
    });
  };

  return (
    <Card className="mt-4">
      <CardHeader className="flex flex-row items-center gap-2">
        {icon}
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading reports...</p>
        ) : reports.length === 0 ? (
          <p className="text-sm text-muted-foreground">No reports found.</p>
        ) : (
          reports.map((report) => (
            <div
              key={report.id}
              className="border rounded-lg p-3 flex items-center justify-between gap-4"
            >
              <div className="space-y-1">
                <div className="font-medium">{humanizeReportType(report.type)}</div>
                <div className="text-sm text-muted-foreground">{report.periodLabel}</div>
                <div className="text-sm text-muted-foreground">
                  Due {formatDueDate(report.dueDate, locale)}
                </div>
              </div>
              <div className="text-right space-y-1">
                <div className="text-sm font-semibold">
                  {formatMoney(report.amountFinalCents ?? report.amountEstimatedCents ?? 0, locale)}
                </div>
                <Badge
                  variant="outline"
                  className="cursor-pointer hover:bg-accent hover:text-accent-foreground transition-colors"
                  onClick={() => navigate(`/tax/reports/${report.id}`)}
                >
                  {report.status}
                </Badge>
                {canSubmit && (
                  <Button size="sm" variant="ghost" onClick={() => onSubmit(report.id)}>
                    Mark as submitted
                  </Button>
                )}
                {!canSubmit && (
                  <Button size="sm" variant="ghost" onClick={() => handleDownload(report.id)}>
                    <Download className="mr-2 h-4 w-4" />
                    Download PDF
                  </Button>
                )}
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

function humanizeReportType(type: string) {
  switch (type) {
    case "VAT_ADVANCE":
      return "Advance VAT declaration";
    case "VAT_ANNUAL":
      return "Annual VAT report";
    case "INCOME_TAX":
      return "Income tax";
    case "EU_SALES_LIST":
      return "EU Sales List (ZM)";
    case "INTRASTAT":
      return "Intrastat Declaration";
    case "TRADE_TAX":
      return "Trade Tax (Gewerbesteuer)";
    case "PROFIT_LOSS":
      return "P&L Statement (EÜR)";
    case "PAYROLL_TAX":
      return "Payroll Tax";
    default:
      return type.replace(/_/g, " ").toLowerCase();
  }
}

function getReportKey(report: any) {
  const date = new Date(report.periodStart);
  if (report.group === "ANNUAL_REPORT" || report.type === "VAT_ANNUAL") {
    return `${date.getUTCFullYear()}`;
  }
  // Quarterly
  const q = Math.floor(date.getUTCMonth() / 3) + 1;
  return `${date.getUTCFullYear()}-Q${q}`;
}
