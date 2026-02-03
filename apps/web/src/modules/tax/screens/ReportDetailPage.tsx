import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { taxApi } from "@/lib/tax-api";
import { Card, CardHeader, CardTitle, CardContent } from "@corely/ui";
import { Button } from "@corely/ui";
import { Badge } from "@corely/ui";
import { Skeleton } from "@/shared/components/Skeleton";
import { ArrowLeft, Download, FileText } from "lucide-react";
import { formatMoney, formatDueDate } from "@/shared/lib/formatters";

export default function ReportDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: report, isLoading } = useQuery({
    queryKey: ["tax-report", id],
    queryFn: () => taxApi.getReport(id!),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="p-6 lg:p-8 space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (!report) {
    return (
      <div className="p-6 lg:p-8">
        <div className="text-center text-muted-foreground">Report not found</div>
        <Button onClick={() => navigate(-1)} className="mt-4">
          Go Back
        </Button>
      </div>
    );
  }

  const locale = "de-DE";

  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{humanizeReportType(report.type)}</h1>
            <p className="text-muted-foreground">
              {report.periodLabel} • Due {formatDueDate(report.dueDate, locale)}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Badge variant="outline" className="text-lg px-3 py-1">
            {report.status}
          </Badge>
          {/* Actions could go here */}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Amount Due</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatMoney(report.amountFinalCents ?? report.amountEstimatedCents ?? 0, locale)}
            </div>
            <p className="text-xs text-muted-foreground">
              {report.status === "PAID" ? "Paid" : "To be paid"}
            </p>
          </CardContent>
        </Card>

        {/* Placeholder for specific report stats */}
        {report.type === "EU_SALES_LIST" && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Lines
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{report.lines?.length ?? 0}</div>
              <p className="text-xs text-muted-foreground">Transactions</p>
            </CardContent>
          </Card>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Report Details</CardTitle>
        </CardHeader>
        <CardContent>
          {report.lines && report.lines.length > 0 ? (
            <div className="relative overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-b">
                  <tr>
                    <th className="px-4 py-3">Section</th>
                    <th className="px-4 py-3">Label</th>
                    <th className="px-4 py-3 text-right">Net Amount</th>
                    <th className="px-4 py-3 text-right">Tax Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {report.lines.map((line, idx) => (
                    <tr
                      key={idx}
                      className="bg-background border-b last:border-0 hover:bg-muted/20"
                    >
                      <td className="px-4 py-3">{line.section || "-"}</td>
                      <td className="px-4 py-3 font-medium">{line.label}</td>
                      <td className="px-4 py-3 text-right">
                        {formatMoney(line.netAmountCents, locale)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {line.taxAmountCents ? formatMoney(line.taxAmountCents, locale) : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-8 w-8 mx-auto mb-2 opacity-20" />
              <p>No detailed lines available for this report.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Raw Meta Debug (for development) */}
      {report.meta && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Debug Metadata</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-xs bg-muted p-4 rounded overflow-auto">
              {JSON.stringify(report.meta, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function humanizeReportType(type: string) {
  return type
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (l) => l.toUpperCase());
}
