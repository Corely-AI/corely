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
import { PeriodList } from "./tax-history-card/period-list";
import { ArchiveDialog, NilDialog, SubmittedDialog } from "./tax-history-card/dialogs";
import {
  FINAL_STATUSES,
  formatDateRange,
  formatIsoDate,
  formatPeriodLabel,
  statusVariant,
} from "./tax-history-card/utils";

export function TaxHistoryCard() {
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
      toast.success("VAT period marked as submitted");
      setSubmittedOpen(false);
    },
    onError: () => toast.error("Failed to mark VAT period as submitted"),
  });

  const markNil = useMutation({
    mutationFn: (payload: { submissionDate?: string; notes?: string }) =>
      taxApi.markVatPeriodNil(selectedPeriod!.periodKey, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["vat-periods"] });
      void queryClient.invalidateQueries({ queryKey: ["tax-summary"] });
      void queryClient.invalidateQueries({ queryKey: ["tax-reports"] });
      toast.success("VAT period marked as nil");
      setNilOpen(false);
    },
    onError: () => toast.error("Failed to mark VAT period as nil"),
  });

  const archivePeriod = useMutation({
    mutationFn: (payload: { reason: string; notes?: string }) =>
      taxApi.archiveVatPeriod(selectedPeriod!.periodKey, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["vat-periods"] });
      void queryClient.invalidateQueries({ queryKey: ["tax-summary"] });
      void queryClient.invalidateQueries({ queryKey: ["tax-reports"] });
      toast.success("VAT period archived");
      setArchiveOpen(false);
    },
    onError: () => toast.error("Failed to archive VAT period"),
  });

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
          <CardTitle>VAT periods</CardTitle>
          <Select value={year} onValueChange={setYear}>
            <SelectTrigger className="w-[100px]">
              <SelectValue placeholder="Year" />
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
            <AlertTitle>Action required: {overduePeriods.length} overdue VAT periods</AlertTitle>
            <AlertDescription className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <span>
                Oldest overdue period is preselected. You can still work on the current period.
              </span>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setSelectedKey(overduePeriods[0]?.periodKey ?? null)}
              >
                Submit overdue periods
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
          <p className="text-sm text-muted-foreground">No data for this year.</p>
        ) : (
          <>
            <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
              <div className="space-y-2">
                <div className="text-sm font-medium text-muted-foreground">Quarter</div>
                <Select value={selectedKey ?? ""} onValueChange={(value) => setSelectedKey(value)}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select quarter" />
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
                  View period details
                </Button>
              ) : null}
            </div>

            {selectedPeriod && (
              <div className="space-y-2 rounded-lg border p-4">
                <div className="text-sm text-muted-foreground">
                  Selected period: {formatPeriodLabel(selectedPeriod)} (
                  {formatDateRange(selectedPeriod.periodStart, selectedPeriod.periodEnd)})
                </div>
                <div className="flex flex-wrap items-center gap-4">
                  <div>
                    <div className="text-xs text-muted-foreground">Tax due</div>
                    <div className="text-lg font-semibold">
                      {formatMoney(selectedPeriod.taxDueCents, "EUR")}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Sales VAT</div>
                    <div className="text-sm font-medium">
                      {formatMoney(selectedPeriod.salesVatCents, "EUR")}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Purchase VAT</div>
                    <div className="text-sm font-medium">
                      {formatMoney(selectedPeriod.purchaseVatCents, "EUR")}
                    </div>
                  </div>
                  <Badge variant={statusVariant(selectedPeriod.status)}>
                    {selectedPeriod.status}
                  </Badge>
                </div>

                {FINAL_STATUSES.includes(selectedPeriod.status) ? (
                  <div className="grid gap-2 text-sm text-muted-foreground">
                    {selectedPeriod.submissionDate && (
                      <div>Submitted on {formatIsoDate(selectedPeriod.submissionDate)}</div>
                    )}
                    {selectedPeriod.submissionReference && (
                      <div>Reference: {selectedPeriod.submissionReference}</div>
                    )}
                    {selectedPeriod.submissionNotes && (
                      <div>Notes: {selectedPeriod.submissionNotes}</div>
                    )}
                    {selectedPeriod.archivedReason && (
                      <div>Archive reason: {selectedPeriod.archivedReason}</div>
                    )}
                    <div className="relative inline-block">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-fit"
                        onClick={() => {
                          const promise = taxApi.getVatPeriodPdfUrl(selectedPeriod.periodKey);
                          toast.promise(
                            promise.then((res) => {
                              if (res.status === "READY" && res.downloadUrl) {
                                window.open(res.downloadUrl, "_blank", "noopener,noreferrer");
                                return;
                              }
                              throw new Error("PENDING");
                            }),
                            {
                              loading: "Generating PDF...",
                              success: "Download started",
                              error: (err) =>
                                err?.message === "PENDING"
                                  ? "PDF is being prepared. Try again shortly."
                                  : "Failed to download PDF",
                            }
                          );
                        }}
                      >
                        <Download className="mr-2 h-4 w-4" />
                        Download PDF
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" onClick={() => setSubmittedOpen(true)}>
                      Mark as submitted
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => setNilOpen(true)}>
                      Mark as nil
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setArchiveOpen(true)}>
                      Archive
                    </Button>
                  </div>
                )}
              </div>
            )}

            <Tabs defaultValue="upcoming" className="space-y-3">
              <TabsList>
                <TabsTrigger value="upcoming">Upcoming reports</TabsTrigger>
                <TabsTrigger value="submitted">Submitted reports</TabsTrigger>
              </TabsList>
              <TabsContent value="upcoming">
                <PeriodList
                  periods={upcomingPeriods}
                  selectedKey={selectedKey}
                  onSelect={setSelectedKey}
                />
              </TabsContent>
              <TabsContent value="submitted">
                <PeriodList
                  periods={submittedPeriods}
                  selectedKey={selectedKey}
                  onSelect={setSelectedKey}
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
