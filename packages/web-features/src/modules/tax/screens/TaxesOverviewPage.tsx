import React from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { taxApi } from "@corely/web-shared/lib/tax-api";
import { useAuth } from "@corely/web-shared/lib/auth-provider";
import { Card, CardContent, CardHeader, CardTitle } from "@corely/ui";
import { Button } from "@corely/ui";
import { Badge } from "@corely/ui";
import { Skeleton } from "@corely/web-shared/shared/components/Skeleton";
import { Alert, AlertDescription, AlertTitle } from "@corely/ui";
import {
  ArrowRight,
  Building,
  CalendarClock,
  FileText,
  HelpCircle,
  Home,
  PiggyBank,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { formatMoney, formatDueDate } from "@corely/web-shared/shared/lib/formatters";
import { TaxHistoryCard } from "../components/TaxHistoryCard";

import { AnnualReportsSection } from "../components/AnnualReportsSection";

export default function TaxesOverviewPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useTranslation();
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["tax-summary"],
    queryFn: () => taxApi.getSummary(),
  });

  const { data: annualReports, isLoading: isLoadingAnnual } = useQuery({
    queryKey: ["tax-reports", "upcoming"],
    queryFn: () => taxApi.listReports("upcoming"),
  });

  const firstName = user?.name?.split(" ")[0] ?? "there";

  const locale = t("common.locale", { defaultValue: "de-DE" });

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
          <AlertTitle>{t("tax.overview.errorLoading")}</AlertTitle>
          <AlertDescription>{t("tax.overview.errorDescription")}</AlertDescription>
        </Alert>
        <Button onClick={() => refetch()}>{t("tax.center.retry")}</Button>
      </div>
    );
  }

  const summary = data;
  const formatCents = (cents: number) => formatMoney(cents, locale);
  const isMissingSettings = summary.configurationStatus === "MISSING_SETTINGS";
  const isNotApplicable = summary.configurationStatus === "NOT_APPLICABLE";

  // Get current period info
  const now = new Date();
  const currentQuarter = Math.floor(now.getUTCMonth() / 3) + 1;
  const currentYear = now.getUTCFullYear();
  const currentPeriodKey = `${currentYear}-Q${currentQuarter}`;

  // Calculate period dates
  const quarterStartMonth = (currentQuarter - 1) * 3;
  const periodStart = new Date(Date.UTC(currentYear, quarterStartMonth, 1));
  const periodEnd = new Date(Date.UTC(currentYear, quarterStartMonth + 3, 1));

  return (
    <div className="p-6 lg:p-8 space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">
            {t("tax.overview.greeting", { name: firstName })}
          </p>
          <h1 className="text-3xl font-bold">{t("tax.overview.title")}</h1>
          {summary.localTaxOfficeName ? (
            <p className="text-muted-foreground">
              {t("tax.overview.yourTaxes")} ·{" "}
              {t("tax.overview.localOffice", { name: summary.localTaxOfficeName })}
            </p>
          ) : (
            <p className="text-muted-foreground">{t("tax.overview.yourTaxes")}</p>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate(`/tax/annual/${currentYear}`)}>
            {t("tax.overview.annualAssistant")}
          </Button>
          <Button variant="secondary" onClick={() => navigate("/tax/reports/eur")}>
            {t("tax.overview.viewReports")}
          </Button>
          <Button variant="default" onClick={() => navigate("/tax/settings")}>
            {t("tax.overview.taxSettings")}
          </Button>
        </div>
      </div>

      {/* Current Period Banner */}
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <CalendarClock className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-semibold">
                  {t("tax.overview.currentVatPeriod", {
                    period: currentQuarter,
                    year: currentYear,
                  })}
                </h3>
              </div>
              <p className="text-sm text-muted-foreground">
                {periodStart.toLocaleDateString(locale)} -{" "}
                {new Date(periodEnd.getTime() - 1).toLocaleDateString(locale)}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="text-sm text-muted-foreground">
                  {t("tax.overview.estimatedVatDue")}
                </div>
                <div className="text-2xl font-bold text-primary">
                  {isMissingSettings ? (
                    <span className="text-muted-foreground text-base">
                      {t("tax.overview.notConfigured")}
                    </span>
                  ) : (
                    formatCents(summary.taxesToBePaidEstimatedCents || 0)
                  )}
                </div>
              </div>
              <Button variant="default" onClick={() => navigate(`/tax/period/${currentPeriodKey}`)}>
                {t("tax.overview.viewDetails")}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card variant="elevated" className="relative overflow-hidden">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm text-muted-foreground">
              {t("tax.overview.kpis.taxesToBePaid")}
            </CardTitle>
            <Home className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-2xl font-semibold">
              {isMissingSettings ? (
                <span className="text-muted-foreground">{t("tax.overview.notConfigured")}</span>
              ) : (
                formatCents(summary.taxesToBePaidEstimatedCents || 0)
              )}
            </div>
            {isNotApplicable && (
              <Badge variant="secondary" className="mt-1">
                {t("tax.overview.kpis.vatNotApplicable")}
              </Badge>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(isMissingSettings ? "/tax/settings" : "/tax/reports/eur")}
            >
              {isMissingSettings
                ? t("tax.overview.kpis.completeSetup")
                : t("tax.overview.kpis.seeOverview")}
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </CardContent>
        </Card>

        <Card variant="elevated" className="relative overflow-hidden">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm text-muted-foreground">
              {t("tax.overview.kpis.income")}
            </CardTitle>
            <PiggyBank className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-2xl font-semibold">{formatCents(summary.incomeTotalCents)}</div>
            {summary.unpaidInvoicesCount > 0 && (
              <Badge variant="warning">
                {t("tax.overview.kpis.unpaidInvoices", { count: summary.unpaidInvoicesCount })}
              </Badge>
            )}
          </CardContent>
        </Card>

        <Card variant="elevated" className="relative overflow-hidden">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm text-muted-foreground">
              {t("tax.overview.kpis.expenses")}
            </CardTitle>
            <FileText className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-2xl font-semibold">
              {formatCents(summary.expensesTotalCents ?? 0)}
            </div>
            {summary.expenseItemsToReviewCount > 0 && (
              <Badge variant="secondary">
                {t("tax.overview.kpis.itemsToReview", { count: summary.expenseItemsToReviewCount })}
              </Badge>
            )}
          </CardContent>
        </Card>
      </div>

      {summary.warnings?.length ? (
        <Alert>
          <AlertTitle>{t("tax.overview.headsUp")}</AlertTitle>
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
          <AlertTitle>{t("tax.overview.settingsIncomplete")}</AlertTitle>
          <AlertDescription className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <span>{t("tax.overview.settingsIncompleteDescription")}</span>
            <Button size="sm" onClick={() => navigate("/tax/settings")}>
              {t("tax.overview.goToSettings")}
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
              <div className="font-medium">{t("tax.overview.expenseHelper.title")}</div>
              <p className="text-sm text-muted-foreground">
                {t("tax.overview.expenseHelper.description")}
              </p>
            </div>
          </div>
          <Button variant="outline" onClick={() => navigate("/assistant")}>
            {t("tax.overview.expenseHelper.learnMore")}
          </Button>
        </CardContent>
      </Card>

      {/* Annual Reports Section */}
      <AnnualReportsSection
        reports={annualReports?.reports?.filter((r) => r.group === "ANNUAL_REPORT") ?? []}
        isLoading={isLoadingAnnual}
        locale={locale}
      />

      {/* Reports section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>{t("tax.overview.yourReports")}</CardTitle>
            <p className="text-sm text-muted-foreground">{t("tax.overview.reportsDescription")}</p>
          </div>
          <Button onClick={() => navigate("/tax/reports/eur")}>
            {t("tax.overview.submitReports")}
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2 text-sm">
            <CalendarClock className="h-4 w-4 text-muted-foreground" />
            <span>
              {t("tax.overview.upcomingDeadline", { count: summary.upcomingReportCount })}
            </span>
          </div>
          {summary.upcomingReportsPreview.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("tax.overview.noUpcoming")}</p>
          ) : (
            <div className="space-y-2">
              {summary.upcomingReportsPreview.map((report) => (
                <div
                  key={report.id}
                  className="rounded-lg border p-3 flex items-center justify-between"
                >
                  <div className="space-y-1">
                    <div className="font-medium">{humanizeReportType(report.type, t)}</div>
                    <div className="text-sm text-muted-foreground">{report.periodLabel}</div>
                  </div>
                  <div className="text-right space-y-1">
                    <div className="text-sm text-muted-foreground">
                      {t("tax.center.nextUp.dueDate")} {formatDueDate(report.dueDate, locale)}
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
          <CardTitle>{t("tax.overview.localTaxOffice")}</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-between">
          {summary.localTaxOfficeName ? (
            <div className="flex items-center gap-2 text-sm">
              <Building className="h-4 w-4 text-muted-foreground" />
              <span>{summary.localTaxOfficeName}</span>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">{t("tax.overview.addLocalOffice")}</div>
          )}
          <Button variant="outline" onClick={() => navigate("/tax/settings")}>
            {t("tax.overview.updateSettings")}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function humanizeReportType(type: string, t: any) {
  switch (type) {
    case "VAT_ADVANCE":
      return t("tax.reports.types.vatAdvance");
    case "VAT_ANNUAL":
      return t("tax.reports.types.vatAnnual");
    case "INCOME_TAX":
      return t("tax.reports.types.incomeTax");
    default:
      return t("tax.reports.types.other", { defaultValue: "Tax report" });
  }
}
