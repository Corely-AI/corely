import React from "react";
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
import { taxApi } from "@/lib/tax-api";
import { EmptyState } from "@/shared/components/EmptyState";
import { CrudListPageLayout, CrudRowActions } from "@/shared/crud";
import {
  ActiveFilterChips,
  FilterPanel,
  ListToolbar,
  type FilterFieldDef,
  useListUrlState,
} from "@/shared/list-kit";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/shared/ui/pagination";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/table";
import { formatDate, formatMoney } from "@/shared/lib/formatters";
import { useTaxCapabilitiesQuery } from "../hooks/useTaxCapabilitiesQuery";
import { useTaxPaymentsQuery } from "../hooks/useTaxPaymentsQuery";
import { taxFilingAttachmentsQueryKey, taxFilingQueryKeys, taxPaymentsQueryKeys } from "../queries";
import { MarkPaidDialog } from "../components/mark-paid-dialog";
import { AttachReceiptDialog } from "../components/attach-receipt-dialog";

const STATUS_LABELS: Record<TaxPaymentStatus, string> = {
  due: "Due",
  overdue: "Overdue",
  paid: "Paid",
};

const STATUS_STYLES: Record<TaxPaymentStatus, string> = {
  due: "bg-amber-50 text-amber-700 border-amber-200",
  overdue: "bg-red-50 text-red-700 border-red-200",
  paid: "bg-green-50 text-green-700 border-green-200",
};

const TYPE_LABELS: Record<TaxFilingType, string> = {
  vat: "VAT",
  "vat-annual": "VAT annual",
  "income-annual": "Income tax",
  trade: "Trade tax",
  payroll: "Payroll",
  "corporate-annual": "Corporate tax",
  "year-end": "Year-end",
  other: "Other",
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
    onError: () => toast.error("Failed to export payments"),
  });

  const markPaidMutation = useMutation({
    mutationFn: ({ filingId, payload }: { filingId: string; payload: MarkTaxFilingPaidRequest }) =>
      taxApi.markFilingPaid(filingId, payload),
    onSuccess: async (_, vars) => {
      toast.success("Marked as paid");
      setMarkPaidTarget(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: taxPaymentsQueryKeys.all() }),
        queryClient.invalidateQueries({ queryKey: taxFilingQueryKeys.detail(vars.filingId) }),
        queryClient.invalidateQueries({ queryKey: taxFilingAttachmentsQueryKey(vars.filingId) }),
      ]);
    },
    onError: () => toast.error("Failed to mark paid"),
  });

  const attachProofMutation = useMutation({
    mutationFn: ({ filingId, documentId }: { filingId: string; documentId: string }) =>
      taxApi.attachPaymentProof(filingId, { proofDocumentId: documentId }),
    onSuccess: async (_, vars) => {
      toast.success("Receipt attached");
      setAttachReceiptTarget(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: taxPaymentsQueryKeys.all() }),
        queryClient.invalidateQueries({ queryKey: taxFilingQueryKeys.detail(vars.filingId) }),
        queryClient.invalidateQueries({ queryKey: taxFilingAttachmentsQueryKey(vars.filingId) }),
      ]);
    },
    onError: () => toast.error("Failed to attach receipt"),
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
        label: "Status",
        type: "select",
        options: Object.entries(STATUS_LABELS).map(([value, label]) => ({ value, label })),
      },
      {
        key: "year",
        label: "Year",
        type: "select",
        options: yearOptions,
      },
      {
        key: "type",
        label: "Filing type",
        type: "select",
        options: Object.entries(TYPE_LABELS).map(([value, label]) => ({ value, label })),
      },
      { key: "dueDate", label: "Due date", type: "date" },
      { key: "paidAt", label: "Paid date", type: "date" },
    ];
  }, []);

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
          title="Unable to load payments"
          description="Check your connection and try again."
          action={
            <Button variant="outline" onClick={() => refetchCapabilities()}>
              Retry
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
        title="Payments"
        subtitle="Track paid vs due filings across the year."
        primaryAction={
          <Button
            variant="outline"
            onClick={() => exportMutation.mutate()}
            disabled={exportMutation.isPending}
          >
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        }
        toolbar={
          <ListToolbar
            search={state.q}
            onSearchChange={(value) => setUrlState({ q: value, page: 1 })}
            sort={state.sort}
            onSortChange={(value) => setUrlState({ sort: value })}
            sortOptions={[
              { label: "Due date (Soonest)", value: "dueDate:asc" },
              { label: "Due date (Latest)", value: "dueDate:desc" },
              { label: "Paid date (Newest)", value: "paidAt:desc" },
              { label: "Paid date (Oldest)", value: "paidAt:asc" },
              { label: "Amount (High-Low)", value: "amount:desc" },
              { label: "Amount (Low-High)", value: "amount:asc" },
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
              title="Unable to load payments"
              description="Check your connection and try again."
              action={
                <Button variant="outline" onClick={() => refetch()}>
                  Retry
                </Button>
              }
            />
          ) : rows.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="No payments to track"
              description="Payments will appear here once filings are submitted."
              action={
                <Button variant="outline" onClick={() => navigate("/tax/filings")}>
                  Go to filings
                </Button>
              }
            />
          ) : (
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
                          <div className="text-sm font-medium">{TYPE_LABELS[row.filingType]}</div>
                          <div className="text-xs text-muted-foreground">{row.periodLabel}</div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDate(row.dueDate, "en-US")}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="text-sm font-medium">
                            {formatMoney(amountCents, "en-US", row.amount.currency)}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {row.amount.direction === "payable" ? "Payable" : "Receivable"}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={STATUS_STYLES[row.paymentStatus]}>
                            {STATUS_LABELS[row.paymentStatus]}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {row.paidAt ? formatDate(row.paidAt, "en-US") : "—"}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {row.method ?? "—"}
                        </TableCell>
                        <TableCell onClick={(event) => event.stopPropagation()}>
                          <CrudRowActions
                            primaryAction={{ label: "Open", href: `/tax/filings/${row.filingId}` }}
                            secondaryActions={[
                              ...(canMarkPaid
                                ? [
                                    {
                                      label: "Mark paid",
                                      onClick: () => setMarkPaidTarget(row),
                                    },
                                  ]
                                : []),
                              ...(canAttachReceipt
                                ? [
                                    {
                                      label: "Attach receipt",
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
