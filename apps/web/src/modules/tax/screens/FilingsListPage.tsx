import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { AlertTriangle, FileText, Plus } from "lucide-react";
import { taxApi } from "@/lib/tax-api";
import { useWorkspace } from "@/shared/workspaces/workspace-provider";
import { Tabs, TabsList, TabsTrigger } from "@/shared/ui/tabs";
import { VatPeriodNavigator } from "../components/VatPeriodNavigator";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { EmptyState } from "@/shared/components/EmptyState";
import { formatDate, formatMoney } from "@/shared/lib/formatters";
import { CrudListPageLayout, CrudRowActions } from "@/shared/crud";
import {
  ActiveFilterChips,
  FilterPanel,
  ListToolbar,
  useListUrlState,
  type FilterFieldDef,
} from "@/shared/list-kit";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/shared/ui/pagination";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import type {
  ListTaxFilingsInput,
  TaxFilingStatus,
  TaxFilingSummary,
  TaxFilingType,
} from "@corely/contracts";

const TAB_CONFIG = [
  { value: "vat", label: "VAT" },
  { value: "income-annual", label: "Income Tax (Annual)" },
  { value: "archive", label: "Archive" },
] as const;

type TabKey = (typeof TAB_CONFIG)[number]["value"];

const STATUS_LABELS: Record<TaxFilingStatus, string> = {
  draft: "Draft",
  needsFix: "Needs attention",
  readyForReview: "Ready for review",
  submitted: "Submitted",
  paid: "Paid",
  archived: "Archived",
};

const TYPE_LABELS: Record<TaxFilingType, string> = {
  vat: "VAT advance",
  "vat-annual": "VAT annual",
  "income-annual": "Income tax annual",
  trade: "Trade tax",
  payroll: "Payroll",
  "corporate-annual": "Corporate annual",
  "year-end": "Year-end",
  other: "Other",
};

const getStatusBadgeClass = (status: TaxFilingStatus) => {
  if (status === "submitted") {
    return "bg-green-50 text-green-700 border-green-200";
  }
  if (status === "needsFix") {
    return "bg-red-50 text-red-700 border-red-200";
  }
  if (status === "paid") {
    return "bg-blue-50 text-blue-700 border-blue-200";
  }
  if (status === "archived") {
    return "bg-gray-100 text-gray-700 border-gray-200";
  }
  return "bg-gray-50 text-gray-700 border-gray-200";
};

const getNextAction = (status: TaxFilingStatus, id: string) => {
  if (status === "submitted") {
    return { label: "Mark paid", href: `/tax/filings/${id}` };
  }
  if (status === "paid" || status === "archived") {
    return { label: "View", href: `/tax/filings/${id}` };
  }
  return { label: "Review", href: `/tax/filings/${id}` };
};

export const FilingsListPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { activeWorkspace } = useWorkspace();
  const [searchParams, setSearchParams] = useSearchParams();
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const [state, setUrlState] = useListUrlState(
    { pageSize: 20, sort: "dueDate:asc" },
    { storageKey: "tax-filings-list-v1" }
  );

  const tab = (searchParams.get("tab") as TabKey | null) ?? "vat";
  const currentYear = new Date().getUTCFullYear();
  const lastYear = currentYear - 1;
  const yearParam = Number(searchParams.get("year"));
  const selectedYear =
    Number.isFinite(yearParam) && yearParam > 2000
      ? yearParam
      : tab === "income-annual"
        ? lastYear
        : currentYear;
  const periodKey = searchParams.get("periodKey") ?? undefined;

  useEffect(() => {
    if (!searchParams.get("tab")) {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.set("tab", tab);
          return next;
        },
        { replace: true }
      );
    }
    if (tab === "vat" && !searchParams.get("year")) {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.set("year", String(selectedYear));
          return next;
        },
        { replace: true }
      );
    }
  }, [searchParams, setSearchParams, selectedYear, tab]);

  const updateParam = (key: string, value?: string) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (value) {
          next.set(key, value);
        } else {
          next.delete(key);
        }
        next.set("page", "1");
        return next;
      },
      { replace: true }
    );
  };

  const handleTabChange = (value: TabKey) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set("tab", value);
        if (value !== "vat") {
          next.delete("periodKey");
          next.delete("year");
        } else if (!next.get("year")) {
          next.set("year", String(currentYear));
        }
        next.set("page", "1");
        return next;
      },
      { replace: true }
    );
  };

  const handleYearChange = (year: number) => {
    updateParam("year", String(year));
    if (tab === "vat") {
      updateParam("periodKey");
    }
  };

  const handlePeriodChange = (key: string) => {
    updateParam("periodKey", key);
  };

  const filterFields = useMemo<FilterFieldDef[]>(
    () => [
      {
        key: "status",
        label: "Status",
        type: "select",
        options: Object.entries(STATUS_LABELS).map(([value, label]) => ({
          value,
          label,
        })),
      },
      { key: "dueDate", label: "Due date", type: "date" },
      {
        key: "needsAttention",
        label: "Needs attention",
        type: "select",
        options: [
          { label: "Yes", value: "true" },
          { label: "No", value: "false" },
        ],
      },
      {
        key: "hasIssues",
        label: "Has issues",
        type: "select",
        options: [
          { label: "Yes", value: "true" },
          { label: "No", value: "false" },
        ],
      },
    ],
    []
  );

  const filingType: TaxFilingType | undefined =
    tab === "vat" ? "vat" : tab === "income-annual" ? "income-annual" : undefined;
  const filingStatus: TaxFilingStatus | undefined = tab === "archive" ? "archived" : undefined;

  const listParams: ListTaxFilingsInput = {
    q: state.q,
    page: state.page,
    pageSize: state.pageSize,
    sort: state.sort,
    filters: state.filters ?? [],
    type: filingType,
    status: filingStatus,
    year: tab === "vat" ? selectedYear : undefined,
    periodKey: tab === "vat" ? periodKey : undefined,
    entityId: activeWorkspace?.legalEntityId,
  };

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["tax", "filings", listParams],
    queryFn: () => taxApi.listFilings(listParams),
    enabled: !!activeWorkspace,
    placeholderData: keepPreviousData,
  });

  const filings = data?.items ?? [];
  const pageInfo = data?.pageInfo;

  const createVatHref = `/tax/filings/new?type=vat&year=${selectedYear}${
    periodKey ? `&periodKey=${periodKey}` : ""
  }`;
  const createAnnualHref = `/tax/filings/new?type=income-annual&year=${selectedYear}`;

  const renderEmptyState = () => {
    if (tab === "income-annual") {
      return (
        <EmptyState
          icon={FileText}
          title="No annual filings found"
          description="Create a new annual income tax filing to get started."
          action={
            <Button variant="outline" onClick={() => navigate(createAnnualHref)}>
              Create annual filing
            </Button>
          }
        />
      );
    }
    if (tab === "vat" && periodKey) {
      return (
        <EmptyState
          icon={FileText}
          title={`No filing for ${periodKey}`}
          description="Start the VAT filing for the selected period."
          action={
            <Button variant="outline" onClick={() => navigate(createVatHref)}>
              Create VAT filing
            </Button>
          }
        />
      );
    }
    return (
      <EmptyState
        icon={FileText}
        title="No filings found"
        description="Try adjusting your filters or creating a new filing."
        action={
          <Button variant="outline" onClick={() => setUrlState({ q: "", filters: [] })}>
            Clear filters
          </Button>
        }
      />
    );
  };

  return (
    <>
      <CrudListPageLayout
        title="Filings"
        subtitle="All tax obligations and returns in one place."
        primaryAction={
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="accent">
                <Plus className="h-4 w-4" />
                Create filing
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => navigate(createVatHref)}>
                VAT filing
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate(createAnnualHref)}>
                Income tax (annual)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        }
        toolbar={
          <div className="flex w-full flex-col gap-3">
            <Tabs value={tab} onValueChange={(value) => handleTabChange(value as TabKey)}>
              <TabsList>
                {TAB_CONFIG.map((item) => (
                  <TabsTrigger key={item.value} value={item.value}>
                    {item.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
            <ListToolbar
              search={state.q}
              onSearchChange={(value) => setUrlState({ q: value, page: 1 })}
              sort={state.sort}
              onSortChange={(value) => setUrlState({ sort: value })}
              sortOptions={[
                { label: "Due date (Soonest)", value: "dueDate:asc" },
                { label: "Due date (Latest)", value: "dueDate:desc" },
                { label: "Period (A-Z)", value: "period:asc" },
                { label: "Amount (High-Low)", value: "amountCents:desc" },
                { label: "Amount (Low-High)", value: "amountCents:asc" },
              ]}
              onFilterClick={() => setIsFilterOpen(true)}
              filterCount={state.filters?.length}
            >
              {isError ? (
                <div className="text-sm text-destructive">
                  {(error as Error)?.message || "Failed to load filings"}
                </div>
              ) : null}
            </ListToolbar>
          </div>
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
        <div className="space-y-4" data-testid="tax-filings-list">
          {tab === "vat" ? (
            <div className="border-b border-border px-4 py-3">
              <VatPeriodNavigator
                year={selectedYear}
                onYearChange={handleYearChange}
                selectedPeriodKey={periodKey}
                onSelectPeriod={handlePeriodChange}
                entityId={activeWorkspace?.legalEntityId}
              />
            </div>
          ) : null}

          {isLoading ? (
            <div className="rounded-md border border-border">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                      Type
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                      Period
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                      Due date
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                      Status
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                      Amount (est.)
                    </th>
                    <th className="w-[120px]"></th>
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: 5 }).map((_, idx) => (
                    <tr key={idx} className="border-b border-border">
                      <td colSpan={6} className="h-14 animate-pulse bg-muted/20" />
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : isError ? (
            <EmptyState
              icon={AlertTriangle}
              title="Unable to load filings"
              description="Check your connection and try again."
              action={
                <Button variant="outline" onClick={() => refetch()}>
                  Retry
                </Button>
              }
            />
          ) : filings.length === 0 ? (
            renderEmptyState()
          ) : (
            <>
              <div className="rounded-md border border-border">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                        Type
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                        Period
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                        Due date
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                        Status
                      </th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                        Amount (est.)
                      </th>
                      <th className="w-[120px]"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filings.map((filing: TaxFilingSummary) => (
                      <tr
                        key={filing.id}
                        className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors cursor-pointer"
                        onClick={() =>
                          navigate(`/tax/filings/${filing.id}`, {
                            state: { from: `${location.pathname}${location.search}` },
                          })
                        }
                      >
                        <td className="px-4 py-3 text-sm font-medium">
                          {TYPE_LABELS[filing.type] ?? filing.type.replace(/-/g, " ")}
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">
                          {filing.periodLabel}
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">
                          {formatDate(filing.dueDate, "en-US")}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="outline" className={getStatusBadgeClass(filing.status)}>
                            {STATUS_LABELS[filing.status] ?? "Draft"}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-sm text-right font-medium">
                          {filing.amountCents !== null
                            ? formatMoney(filing.amountCents, "en-US", filing.currency ?? "EUR")
                            : "—"}
                        </td>
                        <td className="px-2 py-3" onClick={(event) => event.stopPropagation()}>
                          <CrudRowActions
                            primaryAction={getNextAction(filing.status, filing.id)}
                            secondaryActions={[
                              { label: "Export", disabled: true },
                              { label: "Archive", disabled: true },
                            ]}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {pageInfo && (
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
              )}
            </>
          )}
        </div>
      </CrudListPageLayout>

      <FilterPanel
        open={isFilterOpen}
        onOpenChange={setIsFilterOpen}
        filters={state.filters ?? []}
        onApply={(filters) => setUrlState({ filters, page: 1 })}
        fields={filterFields}
      />
    </>
  );
};
