import React from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Download, FileText } from "lucide-react";
import { toast } from "sonner";
import type {
  FilterSpec,
  MarkTaxFilingPaidRequest,
  TaxFilingType,
  TaxPaymentRow,
  TaxPaymentStatus,
} from "@corely/contracts";
import { taxApi } from "@corely/web-shared/lib/tax-api";
import { EmptyState } from "@corely/web-shared/shared/components/EmptyState";
import { CrudListPageLayout, CrudRowActions } from "@corely/web-shared/shared/crud";
import {
  ActiveFilterChips,
  FilterPanel,
  ListToolbar,
  type FilterFieldDef,
  useListUrlState,
} from "@corely/web-shared/shared/list-kit";
import { Badge } from "@corely/ui";
import { Button } from "@corely/ui";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@corely/ui";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@corely/ui";
import { formatDate, formatMoney } from "@corely/web-shared/shared/lib/formatters";
import { useTaxCapabilitiesQuery } from "../hooks/useTaxCapabilitiesQuery";
import { useTaxPaymentsQuery } from "../hooks/useTaxPaymentsQuery";
import { taxFilingAttachmentsQueryKey, taxFilingQueryKeys, taxPaymentsQueryKeys } from "../queries";
import { MarkPaidDialog } from "../components/mark-paid-dialog";
import { AttachReceiptDialog } from "../components/attach-receipt-dialog";

const STATUS_STYLES: Record<TaxPaymentStatus, string> = {
  due: "bg-amber-50 text-amber-700 border-amber-200",
  overdue: "bg-red-50 text-red-700 border-red-200",
  paid: "bg-green-50 text-green-700 border-green-200",
};

const toIsoDate = (value?: string) => {
  if (!value) {
    return undefined;
  }
  if (value.includes("T")) {
    return value;
  }
  return new Date(`${value}T00:00:00.000Z`).toISOString();
};

const toDateInputValue = (value?: string | null) => {
  if (!value) {
    return undefined;
  }
  return value.includes("T") ? value.slice(0, 10) : value;
};

export const TaxPaymentsPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [isFilterOpen, setIsFilterOpen] = React.useState(false);
  const [markPaidTarget, setMarkPaidTarget] = React.useState<TaxPaymentRow | null>(null);
  const [attachReceiptTarget, setAttachReceiptTarget] = React.useState<TaxPaymentRow | null>(null);
  const didInitFilters = React.useRef(false);

  const {
    data: taxCapabilities,
    isLoading: isCapabilitiesLoading,
    isError: isCapabilitiesError,
    refetch: refetchCapabilities,
  } = useTaxCapabilitiesQuery(true);
  const paymentsEnabled = taxCapabilities?.paymentsEnabled ?? false;

  const [state, setUrlState] = useListUrlState(
    { pageSize: 20, sort: "dueDate:asc" },
    { storageKey: "tax-payments-list-v1" }
  );

  const filters = state.filters ?? [];
  const statusFilter = filters.find((f) => f.field === "status");
  const status = statusFilter
    ? Array.isArray(statusFilter.value)
      ? statusFilter.value[0]
      : statusFilter.value
    : undefined;

  const typeFilter = filters.find((f) => f.field === "type");
  const type = typeFilter
    ? Array.isArray(typeFilter.value)
      ? typeFilter.value[0]
      : typeFilter.value
    : undefined;

  const yearFilter = filters.find((f) => f.field === "year");
  const year = yearFilter
    ? Number(Array.isArray(yearFilter.value) ? yearFilter.value[0] : yearFilter.value)
    : undefined;

  const dueFromFilter = filters.find((f) => f.field === "dueDate" && f.operator === "gte");
  const dueToFilter = filters.find((f) => f.field === "dueDate" && f.operator === "lte");
  const paidFromFilter = filters.find((f) => f.field === "paidAt" && f.operator === "gte");
  const paidToFilter = filters.find((f) => f.field === "paidAt" && f.operator === "lte");

  const dueFrom = toIsoDate(dueFromFilter?.value as string | undefined);
  const dueTo = toIsoDate(dueToFilter?.value as string | undefined);
  const paidFrom = toIsoDate(paidFromFilter?.value as string | undefined);
  const paidTo = toIsoDate(paidToFilter?.value as string | undefined);

  const listParams = {
    q: state.q,
    page: state.page,
    pageSize: state.pageSize,
    sort: state.sort,
    filters,
    status: status as TaxPaymentStatus | undefined,
    year: Number.isFinite(year) ? year : undefined,
    type: type as TaxFilingType | undefined,
    dueFrom,
    dueTo,
    paidFrom,
    paidTo,
  };

  const { data, isLoading, isError, refetch } = useTaxPaymentsQuery(listParams, paymentsEnabled);

  const locale = t("common.locale", { defaultValue: "en-US" });

  const statusLabels: Record<TaxPaymentStatus, string> = React.useMemo(
    () => ({
      due: t("tax.payments.status.due"),
      overdue: t("tax.payments.status.overdue"),
      paid: t("tax.payments.status.paid"),
    }),
    [t]
  );

  const typeLabels: Record<TaxFilingType, string> = React.useMemo(
    () => ({
      vat: t("tax.payments.types.vat"),
      "vat-annual": t("tax.payments.types.vatAnnual"),
      "income-annual": t("tax.payments.types.incomeAnnual"),
      trade: t("tax.payments.types.trade"),
      payroll: t("tax.payments.types.payroll"),
      "corporate-annual": t("tax.payments.types.corporateAnnual"),
      "year-end": t("tax.payments.types.yearEnd"),
      other: t("tax.payments.types.other"),
    }),
    [t]
  );

  const exportMutation = useMutation({
    mutationFn: () => taxApi.exportPayments(listParams),
    onSuccess: ({ csv }) => {
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `tax-payments-${new Date().toISOString().slice(0, 10)}.csv`;
      link.click();
      window.URL.revokeObjectURL(url);
    },
    onError: () => toast.error(t("tax.payments.actions.exportFailed")),
  });

  const markPaidMutation = useMutation({
    mutationFn: ({ filingId, payload }: { filingId: string; payload: MarkTaxFilingPaidRequest }) =>
      taxApi.markFilingPaid(filingId, payload),
    onSuccess: async (_, vars) => {
      toast.success(t("tax.payments.actions.markedPaid"));
      setMarkPaidTarget(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: taxPaymentsQueryKeys.all() }),
        queryClient.invalidateQueries({ queryKey: taxFilingQueryKeys.detail(vars.filingId) }),
        queryClient.invalidateQueries({ queryKey: taxFilingAttachmentsQueryKey(vars.filingId) }),
      ]);
    },
    onError: () => toast.error(t("tax.payments.actions.markPaidFailed")),
  });

  const attachProofMutation = useMutation({
    mutationFn: ({ filingId, documentId }: { filingId: string; documentId: string }) =>
      taxApi.attachPaymentProof(filingId, { proofDocumentId: documentId }),
    onSuccess: async (_, vars) => {
      toast.success(t("tax.payments.actions.receiptAttached"));
      setAttachReceiptTarget(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: taxPaymentsQueryKeys.all() }),
        queryClient.invalidateQueries({ queryKey: taxFilingQueryKeys.detail(vars.filingId) }),
        queryClient.invalidateQueries({ queryKey: taxFilingAttachmentsQueryKey(vars.filingId) }),
      ]);
    },
    onError: () => toast.error(t("tax.payments.actions.attachReceiptFailed")),
  });

  const filterFields = React.useMemo<FilterFieldDef[]>(() => {
    const currentYear = new Date().getUTCFullYear();
    const yearOptions = Array.from({ length: 6 }).map((_, idx) => ({
      label: String(currentYear - idx),
      value: currentYear - idx,
    }));

    return [
      {
        key: "status",
        label: t("common.status"),
        type: "select",
        options: Object.entries(statusLabels).map(([value, label]) => ({ value, label })),
      },
      {
        key: "year",
        label: t("tax.center.annual.title"),
        type: "select",
        options: yearOptions,
      },
      {
        key: "type",
        label: t("tax.payments.columns.filing"),
        type: "select",
        options: Object.entries(typeLabels).map(([value, label]) => ({ value, label })),
      },
      { key: "dueDate", label: t("tax.payments.columns.dueDate"), type: "date" },
      { key: "paidAt", label: t("tax.payments.columns.paidDate"), type: "date" },
    ];
  }, [t, statusLabels, typeLabels]);

  const searchParamsKey = searchParams.toString();
  React.useEffect(() => {
    if (didInitFilters.current) {
      return;
    }

    const statusParam = searchParams.get("status");
    const yearParam = searchParams.get("year");
    const typeParam = searchParams.get("type");
    const dueFromParam = searchParams.get("dueFrom");
    const dueToParam = searchParams.get("dueTo");
    const paidFromParam = searchParams.get("paidFrom");
    const paidToParam = searchParams.get("paidTo");

    const hasExplicitFilters = Boolean(
      statusParam ||
      yearParam ||
      typeParam ||
      dueFromParam ||
      dueToParam ||
      paidFromParam ||
      paidToParam
    );

    if (!searchParams.get("filters") && hasExplicitFilters) {
      const nextFilters: FilterSpec[] = [];
      if (statusParam) {
        nextFilters.push({ field: "status", operator: "eq", value: statusParam });
      }
      if (yearParam) {
        nextFilters.push({ field: "year", operator: "eq", value: yearParam });
      }
      if (typeParam) {
        nextFilters.push({ field: "type", operator: "eq", value: typeParam });
      }
      if (dueFromParam) {
        nextFilters.push({
          field: "dueDate",
          operator: "gte",
          value: toDateInputValue(dueFromParam) ?? dueFromParam,
        });
      }
      if (dueToParam) {
        nextFilters.push({
          field: "dueDate",
          operator: "lte",
          value: toDateInputValue(dueToParam) ?? dueToParam,
        });
      }
      if (paidFromParam) {
        nextFilters.push({
          field: "paidAt",
          operator: "gte",
          value: toDateInputValue(paidFromParam) ?? paidFromParam,
        });
      }
      if (paidToParam) {
        nextFilters.push({
          field: "paidAt",
          operator: "lte",
          value: toDateInputValue(paidToParam) ?? paidToParam,
        });
      }
      if (nextFilters.length > 0) {
        setUrlState({ filters: nextFilters, page: 1 });
      }
    }

    didInitFilters.current = true;
  }, [searchParamsKey, searchParams, setUrlState]);

  React.useEffect(() => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        const setOrDelete = (key: string, value?: string | number) => {
          if (value !== undefined && value !== null && value !== "") {
            next.set(key, String(value));
          } else {
            next.delete(key);
          }
        };

        setOrDelete("status", status as string | undefined);
        setOrDelete("year", Number.isFinite(year) ? year : undefined);
        setOrDelete("type", type as string | undefined);
        setOrDelete("dueFrom", dueFrom);
        setOrDelete("dueTo", dueTo);
        setOrDelete("paidFrom", paidFrom);
        setOrDelete("paidTo", paidTo);

        return next;
      },
      { replace: true }
    );
  }, [status, year, type, dueFrom, dueTo, paidFrom, paidTo, setSearchParams]);

  React.useEffect(() => {
    if (!isCapabilitiesLoading && !isCapabilitiesError && !paymentsEnabled) {
      navigate("/tax/filings", { replace: true });
    }
  }, [navigate, paymentsEnabled, isCapabilitiesLoading, isCapabilitiesError]);

  if (isCapabilitiesLoading) {
    return (
      <div className="p-6 lg:p-8">
        <div className="h-6 w-40 animate-pulse rounded bg-muted" />
      </div>
    );
  }

  if (isCapabilitiesError) {
    return (
      <div className="p-6 lg:p-8">
        <EmptyState
          icon={AlertTriangle}
          title={t("tax.payments.error.title")}
          description={t("tax.payments.error.description")}
          action={
            <Button variant="outline" onClick={() => refetchCapabilities()}>
              {t("tax.center.retry")}
            </Button>
          }
        />
      </div>
    );
  }

  if (!paymentsEnabled) {
    return null;
  }

  const rows = data?.items ?? [];
  const pageInfo = data?.pageInfo;

  return (
    <>
      <CrudListPageLayout
        title={t("tax.payments.title")}
        subtitle={t("tax.payments.subtitle")}
        primaryAction={
          <Button
            variant="outline"
            onClick={() => exportMutation.mutate()}
            disabled={exportMutation.isPending}
          >
            <Download className="h-4 w-4" />
            {t("tax.payments.exportCsv")}
          </Button>
        }
        toolbar={
          <ListToolbar
            search={state.q}
            onSearchChange={(value) => setUrlState({ q: value, page: 1 })}
            sort={state.sort}
            onSortChange={(value) => setUrlState({ sort: value })}
            sortOptions={[
              { label: t("tax.payments.sort.dueDateSoonest"), value: "dueDate:asc" },
              { label: t("tax.payments.sort.dueDateLatest"), value: "dueDate:desc" },
              { label: t("tax.payments.sort.paidDateNewest"), value: "paidAt:desc" },
              { label: t("tax.payments.sort.paidDateOldest"), value: "paidAt:asc" },
              { label: t("tax.payments.sort.amountHighLow"), value: "amount:desc" },
              { label: t("tax.payments.sort.amountLowHigh"), value: "amount:asc" },
            ]}
            onFilterClick={() => setIsFilterOpen(true)}
            filterCount={state.filters?.length}
          />
        }
        filters={
          (state.filters?.length ?? 0) > 0 ? (
            <ActiveFilterChips
              filters={state.filters ?? []}
              onRemove={(filter) => {
                const next = state.filters?.filter((f) => f !== filter) ?? [];
                setUrlState({ filters: next, page: 1 });
              }}
              onClearAll={() => setUrlState({ filters: [], page: 1 })}
            />
          ) : undefined
        }
      >
        <div className="space-y-4">
          {isLoading ? (
            <div className="rounded-md border border-border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Filing</TableHead>
                    <TableHead>Due date</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Paid date</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead className="w-[120px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Array.from({ length: 5 }).map((_, idx) => (
                    <TableRow key={idx}>
                      <TableCell colSpan={7} className="h-14 animate-pulse bg-muted/20" />
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : isError ? (
            <EmptyState
              icon={AlertTriangle}
              title={t("tax.payments.error.title")}
              description={t("tax.payments.error.description")}
              action={
                <Button variant="outline" onClick={() => refetch()}>
                  {t("tax.center.retry")}
                </Button>
              }
            />
          ) : rows.length === 0 ? (
            <EmptyState
              icon={FileText}
              title={t("tax.payments.empty.title")}
              description={t("tax.payments.empty.description")}
              action={
                <Button variant="outline" onClick={() => navigate("/tax/filings")}>
                  {t("tax.payments.empty.goToFilings")}
                </Button>
              }
            />
          ) : (
            <div className="rounded-md border border-border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>{t("tax.payments.columns.filing")}</TableHead>
                    <TableHead>{t("tax.payments.columns.dueDate")}</TableHead>
                    <TableHead className="text-right">{t("tax.payments.columns.amount")}</TableHead>
                    <TableHead>{t("common.status")}</TableHead>
                    <TableHead>{t("tax.payments.columns.paidDate")}</TableHead>
                    <TableHead>{t("tax.payments.columns.method")}</TableHead>
                    <TableHead className="w-[120px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => {
                    const canMarkPaid =
                      row.paymentStatus !== "paid" && row.amount.direction === "payable";
                    const canAttachReceipt = row.paymentStatus === "paid" && !row.proofDocumentId;
                    const amountCents =
                      Math.round(row.amount.value * 100) *
                      (row.amount.direction === "receivable" ? -1 : 1);

                    return (
                      <TableRow
                        key={row.filingId}
                        className="cursor-pointer"
                        onClick={() =>
                          navigate(`/tax/filings/${row.filingId}`, {
                            state: { from: `${location.pathname}${location.search}` },
                          })
                        }
                      >
                        <TableCell>
                          <div className="text-sm font-medium">{typeLabels[row.filingType]}</div>
                          <div className="text-xs text-muted-foreground">{row.periodLabel}</div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDate(row.dueDate, locale)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="text-sm font-medium">
                            {formatMoney(amountCents, locale, row.amount.currency)}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {row.amount.direction === "payable"
                              ? t("tax.payments.columns.payable")
                              : t("tax.payments.columns.receivable")}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={STATUS_STYLES[row.paymentStatus]}>
                            {statusLabels[row.paymentStatus]}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {row.paidAt ? formatDate(row.paidAt, locale) : "—"}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {row.method ?? "—"}
                        </TableCell>
                        <TableCell onClick={(event) => event.stopPropagation()}>
                          <CrudRowActions
                            primaryAction={{
                              label: t("common.open"),
                              href: `/tax/filings/${row.filingId}`,
                            }}
                            secondaryActions={[
                              ...(canMarkPaid
                                ? [
                                    {
                                      label: t("tax.payments.actions.markPaid"),
                                      onClick: () => setMarkPaidTarget(row),
                                    },
                                  ]
                                : []),
                              ...(canAttachReceipt
                                ? [
                                    {
                                      label: t("tax.payments.actions.attachReceipt"),
                                      onClick: () => setAttachReceiptTarget(row),
                                    },
                                  ]
                                : []),
                            ]}
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>

              {pageInfo ? (
                <Pagination className="border-t border-border p-4">
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        onClick={() => state.page > 1 && setUrlState({ page: state.page - 1 })}
                        className={
                          state.page <= 1 ? "pointer-events-none opacity-50" : "cursor-pointer"
                        }
                      />
                    </PaginationItem>
                    <PaginationItem>
                      <PaginationNext
                        onClick={() =>
                          pageInfo.hasNextPage && setUrlState({ page: state.page + 1 })
                        }
                        className={
                          !pageInfo.hasNextPage
                            ? "pointer-events-none opacity-50"
                            : "cursor-pointer"
                        }
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              ) : null}
            </div>
          )}
        </div>
      </CrudListPageLayout>

      <FilterPanel
        open={isFilterOpen}
        onOpenChange={setIsFilterOpen}
        filters={state.filters ?? []}
        fields={filterFields}
        onApply={(nextFilters) => setUrlState({ filters: nextFilters, page: 1 })}
      />

      <MarkPaidDialog
        open={Boolean(markPaidTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setMarkPaidTarget(null);
          }
        }}
        defaultAmountCents={
          markPaidTarget ? Math.round(markPaidTarget.amount.value * 100) : undefined
        }
        isSubmitting={markPaidMutation.isPending}
        onSubmit={async (payload) => {
          if (!markPaidTarget) {
            return;
          }
          try {
            await markPaidMutation.mutateAsync({
              filingId: markPaidTarget.filingId,
              payload,
            });
          } catch {
            // handled by mutation onError
          }
        }}
      />

      <AttachReceiptDialog
        open={Boolean(attachReceiptTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setAttachReceiptTarget(null);
          }
        }}
        isSubmitting={attachProofMutation.isPending}
        onAttach={async (documentId) => {
          if (!attachReceiptTarget) {
            return;
          }
          try {
            await attachProofMutation.mutateAsync({
              filingId: attachReceiptTarget.filingId,
              documentId,
            });
          } catch {
            // handled by mutation onError
          }
        }}
      />
    </>
  );
};
