import React from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { taxApi } from "@/lib/tax-api";
import { useAuth } from "@/lib/auth-provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import { Skeleton } from "@/shared/components/Skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/shared/ui/alert";
import {
  ArrowRight,
  Building,
  CalendarClock,
  FileText,
  HelpCircle,
  Home,
  PiggyBank,
} from "lucide-react";
import { formatMoney, formatRelativeTime } from "@/shared/lib/formatters";
import { TaxHistoryCard } from "../components/TaxHistoryCard";

export default function TaxesOverviewPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["tax-summary"],
    queryFn: () => taxApi.getSummary(),
  });

  const firstName = user?.name?.split(" ")[0] ?? "there";

  const locale = "de-DE";

  if (isLoading) {
    return (
      <div className="p-6 lg:p-8 space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
        <Skeleton className="h-32" />
        <Skeleton className="h-40" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="p-6 lg:p-8 space-y-4">
        <Alert variant="destructive">
          <AlertTitle>Could not load taxes</AlertTitle>
          <AlertDescription>
            Something went wrong while fetching your tax overview.
          </AlertDescription>
        </Alert>
        <Button onClick={() => refetch()}>Retry</Button>
      </div>
    );
  }

  const summary = data;
  const formatCents = (cents: number) => formatMoney(cents, locale);
  const isMissingSettings = summary.configurationStatus === "MISSING_SETTINGS";
  const isNotApplicable = summary.configurationStatus === "NOT_APPLICABLE";

  return (
    <div className="p-6 lg:p-8 space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Good evening, {firstName}!</p>
          <h1 className="text-3xl font-bold">Taxes</h1>
          {summary.localTaxOfficeName ? (
            <p className="text-muted-foreground">
              Your taxes in your region · Local office: {summary.localTaxOfficeName}
            </p>
          ) : (
            <p className="text-muted-foreground">Your taxes in your region</p>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => navigate("/tax/reports")}>
            View reports
          </Button>
          <Button variant="default" onClick={() => navigate("/tax/settings")}>
            Tax settings
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card variant="elevated" className="relative overflow-hidden">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm text-muted-foreground">Taxes to be paid</CardTitle>
            <Home className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-2xl font-semibold">
              {isMissingSettings ? (
                <span className="text-muted-foreground">Not configured</span>
              ) : (
                formatCents(summary.taxesToBePaidEstimatedCents || 0)
              )}
            </div>
            {isNotApplicable && (
              <Badge variant="secondary" className="mt-1">
                VAT not applicable
              </Badge>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(isMissingSettings ? "/tax/settings" : "/tax/reports")}
            >
              {isMissingSettings ? "Complete tax setup" : "See taxes overview"}
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </CardContent>
        </Card>

        <Card variant="elevated" className="relative overflow-hidden">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm text-muted-foreground">Income</CardTitle>
            <PiggyBank className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-2xl font-semibold">{formatCents(summary.incomeTotalCents)}</div>
            {summary.unpaidInvoicesCount > 0 && (
              <Badge variant="warning">{summary.unpaidInvoicesCount} unpaid invoices</Badge>
            )}
          </CardContent>
        </Card>

        <Card variant="elevated" className="relative overflow-hidden">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm text-muted-foreground">Expenses</CardTitle>
            <FileText className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-2xl font-semibold">
              {formatCents(summary.expensesTotalCents ?? 0)}
            </div>
            {summary.expenseItemsToReviewCount > 0 && (
              <Badge variant="secondary">{summary.expenseItemsToReviewCount} items to review</Badge>
            )}
          </CardContent>
        </Card>
      </div>

      {summary.warnings?.length ? (
        <Alert>
          <AlertTitle>Heads up</AlertTitle>
          <AlertDescription>
            <ul className="list-disc list-inside space-y-1">
              {summary.warnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      ) : null}

      {isMissingSettings && (
        <Alert>
          <AlertTitle>Tax settings incomplete</AlertTitle>
          <AlertDescription className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <span>Configure your tax profile to estimate what you owe.</span>
            <Button size="sm" onClick={() => navigate("/tax/settings")}>
              Go to tax settings
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Helper card */}
      <Card className="bg-muted/50">
        <CardContent className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <HelpCircle className="h-5 w-5 text-primary" />
            <div>
              <div className="font-medium">What can I expense?</div>
              <p className="text-sm text-muted-foreground">
                Learn which purchases you can categorize as business expenses.
              </p>
            </div>
          </div>
          <Button variant="outline" onClick={() => navigate("/assistant")}>
            Learn more
          </Button>
        </CardContent>
      </Card>

      {/* Reports section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Your tax reports</CardTitle>
            <p className="text-sm text-muted-foreground">
              Based on your details, these are the reports you are currently required to submit…
            </p>
          </div>
          <Button onClick={() => navigate("/tax/reports")}>Submit reports</Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2 text-sm">
            <CalendarClock className="h-4 w-4 text-muted-foreground" />
            <span>{summary.upcomingReportCount} upcoming deadline</span>
          </div>
          {summary.upcomingReportsPreview.length === 0 ? (
            <p className="text-sm text-muted-foreground">No upcoming reports.</p>
          ) : (
            <div className="space-y-2">
              {summary.upcomingReportsPreview.map((report) => (
                <div
                  key={report.id}
                  className="rounded-lg border p-3 flex items-center justify-between"
                >
                  <div className="space-y-1">
                    <div className="font-medium">{humanizeReportType(report.type)}</div>
                    <div className="text-sm text-muted-foreground">{report.periodLabel}</div>
                  </div>
                  <div className="text-right space-y-1">
                    <div className="text-sm text-muted-foreground">
                      Due {formatRelativeTime(report.dueDate, locale)}
                    </div>
                    <div className="font-semibold">
                      {formatCents(report.amountEstimatedCents ?? report.amountFinalCents ?? 0)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      
      <TaxHistoryCard />

      {/* Local tax office */}
      <Card>
        <CardHeader>
          <CardTitle>Local tax office</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-between">
          {summary.localTaxOfficeName ? (
            <div className="flex items-center gap-2 text-sm">
              <Building className="h-4 w-4 text-muted-foreground" />
              <span>{summary.localTaxOfficeName}</span>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">
              Add your local tax office to keep your records complete.
            </div>
          )}
          <Button variant="outline" onClick={() => navigate("/tax/settings")}>
            Update settings
          </Button>
        </CardContent>
      </Card>
    </div>
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
    default:
      return "Tax report";
  }
}
