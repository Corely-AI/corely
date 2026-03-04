import React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { taxApi } from "@corely/web-shared/lib/tax-api";
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Badge,
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@corely/ui";
import { formatMoney } from "@corely/web-shared/shared/lib/formatters";
import { Download, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { downloadTaxPdfWithPolling } from "../lib/download-tax-pdf-with-polling";
import { PeriodList } from "./tax-history-card/period-list";
import { ArchiveDialog, NilDialog, SubmittedDialog } from "./tax-history-card/dialogs";
import {
  FINAL_STATUSES,
  formatDateRange,
  formatIsoDate,
  formatPeriodLabel,
  statusVariant,
} from "./tax-history-card/utils";

import { useTranslation } from "react-i18next";

export function TaxHistoryCard() {
  const { t, i18n } = useTranslation();
  const [year, setYear] = React.useState<string>(new Date().getUTCFullYear().toString());
  const [selectedKey, setSelectedKey] = React.useState<string | null>(null);
  const [submittedOpen, setSubmittedOpen] = React.useState(false);
  const [nilOpen, setNilOpen] = React.useState(false);
  const [archiveOpen, setArchiveOpen] = React.useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["vat-periods", year],
    queryFn: () => taxApi.listVatPeriodsByYear(Number(year)),
  });

  const locale = t("common.locale", { defaultValue: i18n.language === "de" ? "de-DE" : "en-US" });

  const periods = data?.periods ?? [];
  const now = new Date();

  const overduePeriods = React.useMemo(
    () =>
      periods
        .filter((period) => period.status === "OVERDUE")
        .sort((a, b) => new Date(a.periodStart).getTime() - new Date(b.periodStart).getTime()),
    [periods]
  );

  const chronologicalPeriods = React.useMemo(
    () =>
      [...periods].sort(
        (a, b) => new Date(a.periodStart).getTime() - new Date(b.periodStart).getTime()
      ),
    [periods]
  );

  const orderedPeriods = React.useMemo(() => {
    const overdueKeys = new Set(overduePeriods.map((period) => period.periodKey));
    const remaining = periods
      .filter((period) => !overdueKeys.has(period.periodKey))
      .sort((a, b) => new Date(a.periodStart).getTime() - new Date(b.periodStart).getTime());
    return [...overduePeriods, ...remaining];
  }, [overduePeriods, periods]);

  const currentPeriod =
    periods.find((period) => {
      const start = new Date(period.periodStart);
      const end = new Date(period.periodEnd);
      return now >= start && now < end;
    }) ?? null;

  React.useEffect(() => {
    if (!orderedPeriods.length) {
      setSelectedKey(null);
      return;
    }

    if (selectedKey && periods.some((period) => period.periodKey === selectedKey)) {
      return;
    }

    const fallback =
      overduePeriods[0]?.periodKey ?? currentPeriod?.periodKey ?? orderedPeriods[0].periodKey;
    setSelectedKey(fallback ?? null);
  }, [orderedPeriods, periods, overduePeriods, currentPeriod, selectedKey]);

  const selectedPeriod = periods.find((period) => period.periodKey === selectedKey) ?? null;

  const markSubmitted = useMutation({
    mutationFn: (payload: { submissionDate?: string; reference?: string; notes?: string }) =>
      taxApi.markVatPeriodSubmitted(selectedPeriod!.periodKey, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["vat-periods"] });
      void queryClient.invalidateQueries({ queryKey: ["tax-summary"] });
      void queryClient.invalidateQueries({ queryKey: ["tax-reports"] });
      toast.success(t("tax.history.messages.submittedSuccess"));
      setSubmittedOpen(false);
    },
    onError: () => toast.error(t("tax.history.messages.submittedError")),
  });

  const markNil = useMutation({
    mutationFn: (payload: { submissionDate?: string; notes?: string }) =>
      taxApi.markVatPeriodNil(selectedPeriod!.periodKey, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["vat-periods"] });
      void queryClient.invalidateQueries({ queryKey: ["tax-summary"] });
      void queryClient.invalidateQueries({ queryKey: ["tax-reports"] });
      toast.success(t("tax.history.messages.nilSuccess"));
      setNilOpen(false);
    },
    onError: () => toast.error(t("tax.history.messages.nilError")),
  });

  const archivePeriod = useMutation({
    mutationFn: (payload: { reason: string; notes?: string }) =>
      taxApi.archiveVatPeriod(selectedPeriod!.periodKey, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["vat-periods"] });
      void queryClient.invalidateQueries({ queryKey: ["tax-summary"] });
      void queryClient.invalidateQueries({ queryKey: ["tax-reports"] });
      toast.success(t("tax.history.messages.archiveSuccess"));
      setArchiveOpen(false);
    },
    onError: () => toast.error(t("tax.history.messages.archiveError")),
  });

  const handleDownloadPdf = React.useCallback(
    async (periodKey: string) => {
      const abortController = new AbortController();
      const loadingToastId = toast.loading(t("tax.history.messages.generatingPdf"));

      try {
        const result = await downloadTaxPdfWithPolling(
          (_signal) => taxApi.getVatPeriodPdfUrl(periodKey),
          abortController.signal
        );

        if (result.status === "READY") {
          window.open(result.downloadUrl, "_blank", "noopener,noreferrer");
          toast.success(t("tax.history.messages.downloadStarted"));
          return;
        }

        if (result.status === "PENDING") {
          toast.info(t("tax.history.messages.pdfPrepared"));
        }
      } catch (error) {
        console.error(error);
        toast.error(t("tax.history.messages.downloadFailed"));
      } finally {
        toast.dismiss(loadingToastId);
      }
    },
    [t]
  );

  const upcomingPeriods = orderedPeriods.filter(
    (period) => !FINAL_STATUSES.includes(period.status)
  );
  const submittedPeriods = orderedPeriods.filter((period) =>
    FINAL_STATUSES.includes(period.status)
  );

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 pb-2">
        <div className="flex flex-row items-center justify-between">
          <CardTitle>{t("tax.history.title")}</CardTitle>
          <Select value={year} onValueChange={setYear}>
            <SelectTrigger className="w-[100px]">
              <SelectValue placeholder={t("tax.history.year")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="2026">2026</SelectItem>
              <SelectItem value="2025">2025</SelectItem>
              <SelectItem value="2024">2024</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {overduePeriods.length > 0 && (
          <Alert>
            <AlertTitle>
              {t("tax.history.overdueAlert", { count: overduePeriods.length })}
            </AlertTitle>
            <AlertDescription className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <span>{t("tax.history.overdueDescription")}</span>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setSelectedKey(overduePeriods[0]?.periodKey ?? null)}
              >
                {t("tax.history.submitOverdue")}
              </Button>
            </AlertDescription>
          </Alert>
        )}
      </CardHeader>
      <CardContent className="space-y-6">
        {isLoading ? (
          <div className="flex justify-center p-4">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : periods.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("tax.history.noData")}</p>
        ) : (
          <>
            <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
              <div className="space-y-2">
                <div className="text-sm font-medium text-muted-foreground">
                  {t("tax.history.quarter")}
                </div>
                <Select value={selectedKey ?? ""} onValueChange={(value) => setSelectedKey(value)}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={t("tax.history.selectQuarter")} />
                  </SelectTrigger>
                  <SelectContent>
                    {chronologicalPeriods.map((period) => (
                      <SelectItem key={period.periodKey} value={period.periodKey}>
                        {formatPeriodLabel(period)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {selectedPeriod ? (
                <Button
                  variant="outline"
                  onClick={() => navigate(`/tax/period/${selectedPeriod.periodKey}`)}
                >
                  {t("tax.history.viewDetails")}
                </Button>
              ) : null}
            </div>

            {selectedPeriod && (
              <div className="space-y-2 rounded-lg border p-4">
                <div className="text-sm text-muted-foreground">
                  {t("tax.history.selectedPeriod", {
                    label: formatPeriodLabel(selectedPeriod),
                    range: formatDateRange(
                      selectedPeriod.periodStart,
                      selectedPeriod.periodEnd,
                      locale
                    ),
                  })}
                </div>
                <div className="flex flex-wrap items-center gap-4">
                  <div>
                    <div className="text-xs text-muted-foreground">{t("tax.history.taxDue")}</div>
                    <div className="text-lg font-semibold">
                      {formatMoney(selectedPeriod.taxDueCents, locale)}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">{t("tax.history.salesVat")}</div>
                    <div className="text-sm font-medium">
                      {formatMoney(selectedPeriod.salesVatCents, locale)}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">
                      {t("tax.history.purchaseVat")}
                    </div>
                    <div className="text-sm font-medium">
                      {formatMoney(selectedPeriod.purchaseVatCents, locale)}
                    </div>
                  </div>
                  <Badge variant={statusVariant(selectedPeriod.status)}>
                    {selectedPeriod.status}
                  </Badge>
                </div>

                {FINAL_STATUSES.includes(selectedPeriod.status) ? (
                  <div className="grid gap-2 text-sm text-muted-foreground">
                    {selectedPeriod.submissionDate && (
                      <div>
                        {t("tax.history.submittedOn", {
                          date: formatIsoDate(selectedPeriod.submissionDate, locale),
                        })}
                      </div>
                    )}
                    {selectedPeriod.submissionReference && (
                      <div>
                        {t("tax.history.reference", { ref: selectedPeriod.submissionReference })}
                      </div>
                    )}
                    {selectedPeriod.submissionNotes && (
                      <div>{t("tax.history.notes", { notes: selectedPeriod.submissionNotes })}</div>
                    )}
                    {selectedPeriod.archivedReason && (
                      <div>
                        {t("tax.history.archiveReason", { reason: selectedPeriod.archivedReason })}
                      </div>
                    )}
                    <div className="relative inline-block">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-fit"
                        onClick={() => void handleDownloadPdf(selectedPeriod.periodKey)}
                      >
                        <Download className="mr-2 h-4 w-4" />
                        {t("tax.history.downloadPdf")}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" onClick={() => setSubmittedOpen(true)}>
                      {t("tax.history.markSubmitted")}
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => setNilOpen(true)}>
                      {t("tax.history.markNil")}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setArchiveOpen(true)}>
                      {t("tax.history.archive")}
                    </Button>
                  </div>
                )}
              </div>
            )}

            <Tabs defaultValue="upcoming" className="space-y-3">
              <TabsList>
                <TabsTrigger value="upcoming">{t("tax.history.tabs.upcoming")}</TabsTrigger>
                <TabsTrigger value="submitted">{t("tax.history.tabs.submitted")}</TabsTrigger>
              </TabsList>
              <TabsContent value="upcoming">
                <PeriodList
                  periods={upcomingPeriods}
                  selectedKey={selectedKey}
                  onSelect={setSelectedKey}
                  locale={locale}
                />
              </TabsContent>
              <TabsContent value="submitted">
                <PeriodList
                  periods={submittedPeriods}
                  selectedKey={selectedKey}
                  onSelect={setSelectedKey}
                  locale={locale}
                />
              </TabsContent>
            </Tabs>
          </>
        )}
      </CardContent>

      <SubmittedDialog
        open={submittedOpen}
        onOpenChange={setSubmittedOpen}
        onSubmit={(payload) => markSubmitted.mutate(payload)}
        isLoading={markSubmitted.isPending}
      />
      <NilDialog
        open={nilOpen}
        onOpenChange={setNilOpen}
        onSubmit={(payload) => markNil.mutate(payload)}
        isLoading={markNil.isPending}
      />
      <ArchiveDialog
        open={archiveOpen}
        onOpenChange={setArchiveOpen}
        onSubmit={(payload) => archivePeriod.mutate(payload)}
        isLoading={archivePeriod.isPending}
      />
    </Card>
  );
}
