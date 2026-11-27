import { PaginationSummary } from "@corely/web-shared/shared/components/pagination-summary";
import { useUiCopy } from "@corely/web-shared/shared/i18n/ui-copy";
import React from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  LoadingSkeleton,
  Badge,
  Button,
  Input,
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
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
import type { PosSalePayment } from "@corely/contracts";
import { posTransactionsApi } from "@corely/web-shared/lib/pos-transactions-api";
import { posRegistersApi } from "@corely/web-shared/lib/pos-registers-api";
import { EmptyState } from "@corely/web-shared/shared/components/EmptyState";
import { CrudListPageLayout, useCrudUrlState } from "@corely/web-shared/shared/crud";
import { formatDateTime, formatMoney } from "@corely/web-shared/shared/lib/formatters";
import { posTransactionKeys } from "../queries";

type PosTransactionStatus = "PENDING_SYNC" | "SYNCED" | "FAILED";

type TransactionFilters = {
  registerId?: string;
  status?: PosTransactionStatus;
  fromDate?: string;
  toDate?: string;
};

const statusOptions: Array<{ label: string; value: "ALL" | PosTransactionStatus }> = [
  { label: "All statuses", value: "ALL" },
  { label: "Synced", value: "SYNCED" },
  { label: "Pending sync", value: "PENDING_SYNC" },
  { label: "Failed", value: "FAILED" },
];

const toIsoString = (value: string | Date): string =>
  value instanceof Date ? value.toISOString() : value;

const formatTimestamp = (value: string | Date): string => formatDateTime(toIsoString(value));

const formatPaymentSummary = (payments: PosSalePayment[]): string => {
  if (payments.length === 0) {
    return "No payments";
  }

  return payments
    .map((payment) => {
      const reference = payment.reference?.trim();
      return reference ? `${payment.method} (${reference})` : payment.method;
    })
    .join(", ");
};

const statusTone = (status: PosTransactionStatus): "default" | "secondary" | "destructive" => {
  if (status === "SYNCED") {
    return "default";
  }

  if (status === "FAILED") {
    return "destructive";
  }

  return "secondary";
};

export function PosTransactionsScreen() {
  const uiCopy = useUiCopy("ui.pos-transactions-postransactionsscreen");
  const [state, setUrlState] = useCrudUrlState({
    pageSize: 20,
    sort: "saleDate:desc",
  });

  const filters = (state.filters ?? {}) as TransactionFilters;
  const queryParams = React.useMemo(
    () => ({
      q: state.q?.trim() || undefined,
      page: state.page,
      pageSize: state.pageSize,
      sort: state.sort,
      registerId: filters.registerId || undefined,
      status: filters.status || undefined,
      fromDate: filters.fromDate || undefined,
      toDate: filters.toDate || undefined,
    }),
    [filters.fromDate, filters.registerId, filters.status, filters.toDate, state]
  );

  const transactionsQuery = useQuery({
    queryKey: posTransactionKeys.list(queryParams),
    queryFn: () => posTransactionsApi.listTransactions(queryParams),
    placeholderData: keepPreviousData,
  });

  const registersQuery = useQuery({
    queryKey: ["pos-registers", "options"],
    queryFn: () => posRegistersApi.listRegisters(),
    staleTime: 60_000,
  });

  const transactions = transactionsQuery.data?.items ?? [];
  const pageInfo = transactionsQuery.data?.pageInfo;
  const registers = registersQuery.data?.registers ?? [];

  return (
    <CrudListPageLayout
      title={uiCopy("transactions")}
      subtitle="Review synced POS sales from registers without editing or refunding them from the admin."
      filters={
        <>
          <Input
            value={state.q ?? ""}
            onChange={(event) => setUrlState({ q: event.target.value, page: 1 })}
            placeholder={uiCopy("search-receipt-transaction-id")}
            className="w-72"
          />
          <Select
            value={filters.registerId ?? "ALL"}
            onValueChange={(value) =>
              setUrlState({
                page: 1,
                filters: {
                  ...filters,
                  registerId: value === "ALL" ? undefined : value,
                },
              })
            }
          >
            <SelectTrigger className="w-48">
              <SelectValue placeholder={uiCopy("register")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">{uiCopy("all-registers")}</SelectItem>
              {registers.map((register) => (
                <SelectItem key={register.registerId} value={register.registerId}>
                  {register.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={filters.status ?? "ALL"}
            onValueChange={(value) =>
              setUrlState({
                page: 1,
                filters: {
                  ...filters,
                  status: value === "ALL" ? undefined : (value as PosTransactionStatus),
                },
              })
            }
          >
            <SelectTrigger className="w-44">
              <SelectValue placeholder={uiCopy("status")} />
            </SelectTrigger>
            <SelectContent>
              {statusOptions.map((status) => (
                <SelectItem key={status.value} value={status.value}>
                  {status.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            type="date"
            value={filters.fromDate ?? ""}
            onChange={(event) =>
              setUrlState({
                page: 1,
                filters: {
                  ...filters,
                  fromDate: event.target.value || undefined,
                },
              })
            }
            className="w-44"
            aria-label={uiCopy("from-date")}
          />
          <Input
            type="date"
            value={filters.toDate ?? ""}
            onChange={(event) =>
              setUrlState({
                page: 1,
                filters: {
                  ...filters,
                  toDate: event.target.value || undefined,
                },
              })
            }
            className="w-44"
            aria-label={uiCopy("to-date")}
          />
        </>
      }
    >
      {transactionsQuery.isLoading ? (
        <LoadingSkeleton variant="list" label={uiCopy("loading-pos-transactions")} />
      ) : transactionsQuery.isError ? (
        <div className="p-6 text-sm text-destructive">{uiCopy("failed-to-load-pos")}</div>
      ) : transactions.length === 0 ? (
        <EmptyState
          title={uiCopy("no-synced-pos-transactions")}
          description={uiCopy("once-pos-sales-sync")}
          action={
            state.q ||
            filters.registerId ||
            filters.status ||
            filters.fromDate ||
            filters.toDate ? (
              <Button
                variant="outline"
                onClick={() =>
                  setUrlState({
                    q: "",
                    page: 1,
                    filters: {},
                  })
                }
              >
                {uiCopy("clear-filters")}
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="space-y-4 p-4">
          <div className="rounded-md border border-border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>{uiCopy("receipt")}</TableHead>
                  <TableHead>{uiCopy("register")}</TableHead>
                  <TableHead>{uiCopy("status")}</TableHead>
                  <TableHead className="text-right">{uiCopy("total")}</TableHead>
                  <TableHead>{uiCopy("payments")}</TableHead>
                  <TableHead>{uiCopy("cashier")}</TableHead>
                  <TableHead>{uiCopy("sold-at")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((transaction) => (
                  <TableRow key={transaction.transactionId}>
                    <TableCell className="align-top">
                      <div className="space-y-1">
                        <Link
                          to={`/pos/admin/transactions/${transaction.transactionId}`}
                          className="font-medium text-foreground hover:underline"
                        >
                          {transaction.receiptNumber}
                        </Link>
                        <div className="text-xs text-muted-foreground">
                          {transaction.transactionId}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="align-top">
                      <div className="space-y-1">
                        <div>{transaction.registerName ?? transaction.registerId}</div>
                        <div className="text-xs text-muted-foreground">
                          {transaction.registerId}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="align-top">
                      <Badge variant={statusTone(transaction.status)}>{transaction.status}</Badge>
                    </TableCell>
                    <TableCell className="align-top text-right font-medium">
                      {formatMoney(transaction.totalCents, undefined, transaction.currency)}
                    </TableCell>
                    <TableCell className="align-top text-sm text-muted-foreground">
                      <div>{formatPaymentSummary(transaction.payments)}</div>
                      <div className="mt-1 text-xs">
                        {transaction.payments.length}
                        {" " + uiCopy("payment")}
                        {transaction.payments.length === 1 ? "" : uiCopy("s")}
                      </div>
                    </TableCell>
                    <TableCell className="align-top text-sm text-muted-foreground">
                      {transaction.cashierEmployeePartyId}
                    </TableCell>
                    <TableCell className="align-top text-sm text-muted-foreground">
                      <div>{formatTimestamp(transaction.saleDate)}</div>
                      <div className="mt-1 text-xs">
                        {uiCopy("synced") + " "}
                        {formatTimestamp(transaction.syncedAt)}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {pageInfo ? (
            <div className="flex flex-col gap-3 px-1 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between">
              <div>
                <PaginationSummary
                  page={pageInfo.page}
                  pages={Math.max(1, Math.ceil(pageInfo.total / pageInfo.pageSize))}
                  total={pageInfo.total}
                />
              </div>
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      onClick={() => pageInfo.page > 1 && setUrlState({ page: pageInfo.page - 1 })}
                      className={
                        pageInfo.page === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"
                      }
                    />
                  </PaginationItem>
                  <PaginationItem>
                    <PaginationLink isActive>{pageInfo.page}</PaginationLink>
                  </PaginationItem>
                  <PaginationItem>
                    <PaginationNext
                      onClick={() =>
                        pageInfo.hasNextPage && setUrlState({ page: pageInfo.page + 1 })
                      }
                      className={
                        !pageInfo.hasNextPage ? "pointer-events-none opacity-50" : "cursor-pointer"
                      }
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          ) : null}
        </div>
      )}
    </CrudListPageLayout>
  );
}
