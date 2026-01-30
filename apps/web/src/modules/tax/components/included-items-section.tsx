import React, { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { EmptyState } from "@/shared/components/EmptyState";
import {
  ListToolbar,
  ActiveFilterChips,
  FilterPanel,
  useListUrlState,
  type FilterFieldDef,
} from "@/shared/list-kit";
import { TableRowSkeleton } from "@/shared/components/Skeleton";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/shared/ui/pagination";
import { formatDate, formatMoney } from "@/shared/lib/formatters";
import type { FilterSpec, TaxFilingItemSourceType } from "@corely/contracts";
import { useTaxFilingItemsQuery } from "../hooks/useTaxFilingItemsQuery";

type IncludedItemsSectionProps = {
  filingId: string;
  presetSourceType?: TaxFilingItemSourceType;
};

const SOURCE_OPTIONS = [
  { label: "Income", value: "income" },
  { label: "Expense", value: "expense" },
  { label: "Transaction", value: "transaction" },
];

export function IncludedItemsSection({ filingId, presetSourceType }: IncludedItemsSectionProps) {
  const navigate = useNavigate();
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const [state, setUrlState] = useListUrlState(
    { pageSize: 10, sort: "date:desc" },
    { storageKey: `tax-filing-items-${filingId}-v1` }
  );

  const filterFields = useMemo<FilterFieldDef[]>(
    () => [
      { key: "sourceType", label: "Source type", type: "select", options: SOURCE_OPTIONS },
      { key: "date", label: "Date", type: "date" },
      { key: "category", label: "Category", type: "text" },
      { key: "needsAttention", label: "Needs attention", type: "boolean" },
      { key: "missingMapping", label: "Missing mapping", type: "boolean" },
    ],
    []
  );

  useEffect(() => {
    if (!presetSourceType) {
      return;
    }
    const existing = state.filters?.find((f) => f.field === "sourceType");
    if (existing && existing.value === presetSourceType) {
      return;
    }
    const nextFilters: FilterSpec[] = [
      { field: "sourceType", operator: "eq", value: presetSourceType },
    ];
    setUrlState({ filters: nextFilters, page: 1 });
  }, [presetSourceType, setUrlState, state.filters]);

  const sourceTypeFilter = useMemo<TaxFilingItemSourceType | undefined>(() => {
    const filter = state.filters?.find((f) => f.field === "sourceType");
    if (!filter) {
      return undefined;
    }
    if (Array.isArray(filter.value)) {
      return filter.value[0] as TaxFilingItemSourceType;
    }
    return filter.value as TaxFilingItemSourceType;
  }, [state.filters]);

  const dateFrom = useMemo<string | undefined>(() => {
    const filter = state.filters?.find((f) => f.field === "date" && f.operator === "gte");
    return filter?.value ? String(filter.value) : undefined;
  }, [state.filters]);

  const dateTo = useMemo<string | undefined>(() => {
    const filter = state.filters?.find((f) => f.field === "date" && f.operator === "lte");
    return filter?.value ? String(filter.value) : undefined;
  }, [state.filters]);

  const category = useMemo<string | undefined>(() => {
    const filter = state.filters?.find((f) => f.field === "category");
    return filter?.value ? String(filter.value) : undefined;
  }, [state.filters]);

  const needsAttention = useMemo<boolean | undefined>(() => {
    const filter = state.filters?.find((f) => f.field === "needsAttention");
    return typeof filter?.value === "boolean" ? filter.value : undefined;
  }, [state.filters]);

  const missingMapping = useMemo<boolean | undefined>(() => {
    const filter = state.filters?.find((f) => f.field === "missingMapping");
    return typeof filter?.value === "boolean" ? filter.value : undefined;
  }, [state.filters]);

  const { data, isLoading, isError } = useTaxFilingItemsQuery(filingId, {
    q: state.q,
    page: state.page,
    pageSize: state.pageSize,
    sort: state.sort,
    filters: state.filters,
    sourceType: sourceTypeFilter,
    dateFrom,
    dateTo,
    category,
    needsAttention,
    missingMapping,
  });

  const items = data?.items ?? [];
  const pageInfo = data?.pageInfo;
  const canPrev = state.page > 1;
  const canNext = pageInfo?.hasNextPage ?? false;

  return (
    <>
      <Card data-testid="tax-filing-included-items">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Included items</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 p-0">
          <div className="px-4 pt-4">
            <ListToolbar
              search={state.q}
              onSearchChange={(value) => setUrlState({ q: value, page: 1 })}
              sort={state.sort}
              onSortChange={(value) => setUrlState({ sort: value })}
              sortOptions={[
                { label: "Date (Newest)", value: "date:desc" },
                { label: "Date (Oldest)", value: "date:asc" },
                { label: "Gross (High)", value: "grossCents:desc" },
                { label: "Gross (Low)", value: "grossCents:asc" },
              ]}
              onFilterClick={() => setIsFilterOpen(true)}
              filterCount={state.filters?.length}
            />
          </div>

          {(state.filters?.length ?? 0) > 0 ? (
            <div className="px-4">
              <ActiveFilterChips
                filters={state.filters ?? []}
                onRemove={(filter) => {
                  const next = state.filters?.filter((f) => f !== filter) ?? [];
                  setUrlState({ filters: next, page: 1 });
                }}
                onClearAll={() => setUrlState({ filters: [], page: 1 })}
              />
            </div>
          ) : null}

          <div className="rounded-md border border-border mx-4 mb-4">
            {isLoading ? (
              <div className="p-4 space-y-3">
                {Array.from({ length: 6 }).map((_, index) => (
                  <TableRowSkeleton key={index} columns={6} />
                ))}
              </div>
            ) : items.length === 0 ? (
              <EmptyState
                title="No items included"
                description="We haven't found any source items for this filing yet."
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                        Type
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                        Date
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                        Counterparty
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                        Description
                      </th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                        Net
                      </th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                        Tax
                      </th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                        Gross
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => (
                      <tr
                        key={item.id}
                        className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors cursor-pointer"
                        onClick={() => navigate(item.deepLink)}
                      >
                        <td className="px-4 py-3 text-sm font-medium">
                          {item.sourceType === "income" ? "Income" : "Expense"}
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">
                          {formatDate(item.date, "en-US")}
                        </td>
                        <td className="px-4 py-3 text-sm">{item.counterparty ?? "—"}</td>
                        <td className="px-4 py-3 text-sm">{item.description ?? "—"}</td>
                        <td className="px-4 py-3 text-sm text-right">
                          {item.netCents != null ? formatMoney(item.netCents, "en-US") : "—"}
                        </td>
                        <td className="px-4 py-3 text-sm text-right">
                          {item.taxCents != null ? formatMoney(item.taxCents, "en-US") : "—"}
                        </td>
                        <td className="px-4 py-3 text-sm text-right">
                          {item.grossCents != null ? formatMoney(item.grossCents, "en-US") : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {pageInfo ? (
            <Pagination className="border-t border-border px-4 py-3">
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    onClick={(event) => {
                      if (!canPrev) {
                        event.preventDefault();
                        return;
                      }
                      setUrlState({ page: Math.max(1, state.page - 1) });
                    }}
                    aria-disabled={!canPrev}
                    tabIndex={canPrev ? 0 : -1}
                    className={!canPrev ? "pointer-events-none opacity-50" : undefined}
                  />
                </PaginationItem>
                <PaginationItem>
                  <span className="text-sm text-muted-foreground">
                    Page {pageInfo.page} of{" "}
                    {Math.max(1, Math.ceil(pageInfo.total / pageInfo.pageSize))}
                  </span>
                </PaginationItem>
                <PaginationItem>
                  <PaginationNext
                    onClick={(event) => {
                      if (!canNext) {
                        event.preventDefault();
                        return;
                      }
                      setUrlState({ page: state.page + 1 });
                    }}
                    aria-disabled={!canNext}
                    tabIndex={canNext ? 0 : -1}
                    className={!canNext ? "pointer-events-none opacity-50" : undefined}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          ) : null}

          {isError ? (
            <div className="px-4 pb-4 text-sm text-destructive">
              Failed to load included items. Please retry.
            </div>
          ) : null}
        </CardContent>
      </Card>

      <FilterPanel
        open={isFilterOpen}
        onOpenChange={setIsFilterOpen}
        filters={state.filters ?? []}
        fields={filterFields}
        onApply={(filters) => setUrlState({ filters, page: 1 })}
      />
    </>
  );
}
