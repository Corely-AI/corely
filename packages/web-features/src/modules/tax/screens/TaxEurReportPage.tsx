import React from "react";
import { useQuery } from "@tanstack/react-query";
import { normalizeError } from "@corely/api-client";
import { taxApi } from "@corely/web-shared/lib/tax-api";
import { formatDateTime, formatMoney } from "@corely/web-shared/shared/lib/formatters";
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@corely/ui";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";
import { useTaxCapabilitiesQuery } from "../hooks/useTaxCapabilitiesQuery";

const YEAR_RANGE = 5;

export function TaxEurReportPage() {
  const { t, i18n } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const locale = t("common.locale", { defaultValue: i18n.language === "de" ? "de-DE" : "en-US" });
  const currentYear = new Date().getFullYear();
  const yearParam = Number(searchParams.get("year"));
  const year =
    Number.isFinite(yearParam) && yearParam > 2000 && yearParam <= currentYear
      ? yearParam
      : currentYear;

  const {
    data: capabilities,
    isLoading: isCapabilitiesLoading,
    isError: isCapabilitiesError,
    refetch: refetchCapabilities,
  } = useTaxCapabilitiesQuery(true);
  const supportsEur = capabilities?.strategy?.supportsEur ?? false;

  const statementQuery = useQuery({
    queryKey: ["tax", "reports", "eur", year],
    queryFn: () => taxApi.getEurStatement({ year }),
    enabled: supportsEur,
  });

  const selectableYears = React.useMemo(
    () => Array.from({ length: YEAR_RANGE }, (_value, index) => currentYear - index),
    [currentYear]
  );

  if (isCapabilitiesError) {
    return (
      <div className="p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
        <Alert variant="destructive">
          <AlertTitle>{t("tax.reports.eur.errors.capabilitiesTitle")}</AlertTitle>
          <AlertDescription>{t("tax.reports.eur.errors.capabilitiesDescription")}</AlertDescription>
        </Alert>
        <Button variant="outline" onClick={() => void refetchCapabilities()}>
          {t("tax.center.retry")}
        </Button>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">{t("tax.reports.eur.title")}</h1>
          <p className="text-muted-foreground">{t("tax.reports.eur.subtitle")}</p>
        </div>
        <div className="w-full md:w-[140px]">
          <Select
            value={String(year)}
            onValueChange={(value) =>
              setSearchParams((prev) => {
                const next = new URLSearchParams(prev);
                next.set("year", value);
                return next;
              })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {selectableYears.map((entryYear) => (
                <SelectItem key={entryYear} value={String(entryYear)}>
                  {entryYear}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {isCapabilitiesLoading ? (
        <Card className="border-border/40">
          <CardContent className="py-10 text-sm text-muted-foreground">
            {t("tax.reports.eur.status.loadingCapabilities")}
          </CardContent>
        </Card>
      ) : null}

      {!isCapabilitiesLoading && !supportsEur ? (
        <Alert>
          <AlertTitle>{t("tax.reports.eur.unsupported.title")}</AlertTitle>
          <AlertDescription>{t("tax.reports.eur.unsupported.description")}</AlertDescription>
        </Alert>
      ) : null}

      {supportsEur && statementQuery.isLoading ? (
        <Card className="border-border/40">
          <CardContent className="py-10 text-sm text-muted-foreground">
            {t("tax.reports.eur.status.loadingStatement")}
          </CardContent>
        </Card>
      ) : null}

      {supportsEur && statementQuery.isError ? (
        <Alert variant="destructive">
          <AlertTitle>{t("tax.reports.eur.errors.statementTitle")}</AlertTitle>
          <AlertDescription className="space-y-3">
            <p>
              {normalizeError(statementQuery.error).detail ?? t("tax.reports.eur.errors.generic")}
            </p>
            <Button variant="outline" onClick={() => void statementQuery.refetch()}>
              {t("tax.center.retry")}
            </Button>
          </AlertDescription>
        </Alert>
      ) : null}

      {supportsEur && statementQuery.data ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="border-border/40">
              <CardHeader>
                <CardTitle>{t("tax.reports.eur.summary.income")}</CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-semibold">
                {formatMoney(
                  statementQuery.data.totals.incomeCents,
                  locale,
                  statementQuery.data.currency
                )}
              </CardContent>
            </Card>
            <Card className="border-border/40">
              <CardHeader>
                <CardTitle>{t("tax.reports.eur.summary.expenses")}</CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-semibold">
                {formatMoney(
                  statementQuery.data.totals.expenseCents,
                  locale,
                  statementQuery.data.currency
                )}
              </CardContent>
            </Card>
            <Card className="border-border/40">
              <CardHeader>
                <CardTitle>{t("tax.reports.eur.summary.profit")}</CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-semibold">
                {formatMoney(
                  statementQuery.data.totals.profitCents,
                  locale,
                  statementQuery.data.currency
                )}
              </CardContent>
            </Card>
          </div>

          <Card className="border-border/40">
            <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
              <CardTitle>{t("tax.reports.eur.lines.title")}</CardTitle>
              <p className="text-sm text-muted-foreground">
                {t("tax.reports.eur.generatedAt", {
                  date: formatDateTime(statementQuery.data.generatedAt, locale),
                })}
              </p>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="border-border/40">
                    <TableHead>{t("tax.reports.eur.lines.columns.line")}</TableHead>
                    <TableHead>{t("tax.reports.eur.lines.columns.group")}</TableHead>
                    <TableHead className="text-right">
                      {t("tax.reports.eur.lines.columns.amount")}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {statementQuery.data.lines.map((line) => (
                    <TableRow key={line.id} className="border-border/30">
                      <TableCell>
                        {t(`tax.reports.eur.lineLabels.${line.id}`, { defaultValue: line.label })}
                      </TableCell>
                      <TableCell>
                        {line.group === "INCOME"
                          ? t("tax.reports.eur.lines.groups.income")
                          : t("tax.reports.eur.lines.groups.expense")}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatMoney(line.amountCents, locale, statementQuery.data.currency)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  );
}

export default TaxEurReportPage;
