import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  useMutation,
  useQuery,
  useQueryClient,
  keepPreviousData,
  useQueries,
} from "@tanstack/react-query";
import { Plus, Trash2, Edit } from "lucide-react";
import { toast } from "sonner";

import { Card, CardContent } from "@corely/ui";
import { Button } from "@corely/ui";
import { Badge } from "@corely/ui";
import { Checkbox } from "@corely/ui";
import { EmptyState } from "@corely/web-shared/shared/components/EmptyState";
import { formatMoney, formatDate } from "@corely/web-shared/shared/lib/formatters";
import { expensesApi } from "@corely/web-shared/lib/expenses-api";
import {
  CrudListPageLayout,
  CrudRowActions,
  ConfirmDeleteDialog,
  invalidateResourceQueries,
} from "@corely/web-shared/shared/crud";
import {
  ListToolbar,
  ActiveFilterChips,
  useListUrlState,
  FilterPanel,
  type FilterFieldDef,
} from "@corely/web-shared/shared/list-kit";
import { expenseKeys } from "../queries";
import { customAttributesApi } from "@corely/web-shared/lib/custom-attributes-api";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@corely/ui";
// ... imports

// ...

const CATEGORY_OPTIONS = [
  { label: "All categories", value: "" },
  { label: "Office supplies", value: "office_supplies" },
  { label: "Software", value: "software" },
  { label: "Travel", value: "travel" },
  { label: "Meals", value: "meals" },
  { label: "Home office", value: "home_office" },
  { label: "Education", value: "education" },
  { label: "Hardware", value: "hardware" },
  { label: "Phone/Internet", value: "phone_internet" },
  { label: "Other", value: "other" },
];

export default function ExpensesPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // URL State
  const [state, setUrlState] = useListUrlState(
    {
      pageSize: 10,
      sort: "expenseDate:desc",
    },
    { storageKey: "expenses-list-v1" }
  );

  const { data: dimensionTypes = [] } = useQuery({
    queryKey: ["custom-attributes", "dimensions", "expense"],
    queryFn: () => customAttributesApi.listDimensionTypes("expense"),
  });
  const dimensionValuesQueries = useQueries({
    queries: dimensionTypes.map((type) => ({
      queryKey: ["custom-attributes", "dimension-values", type.id],
      queryFn: () => customAttributesApi.listDimensionValues(type.id),
      enabled: Boolean(type.id),
    })),
  });
  const { data: indexedCustomFields = [] } = useQuery({
    queryKey: ["custom-attributes", "indexed-custom-fields", "expense"],
    queryFn: () => customAttributesApi.listIndexedCustomFields("expense"),
  });

  const filterFields = useMemo<FilterFieldDef[]>(() => {
    const dimensionFields = dimensionTypes
      .filter((type) => type.isActive)
      .map((type, index) => {
        const values = (
          (dimensionValuesQueries[index]?.data as
            | Array<{ id: string; name: string; isActive: boolean }>
            | undefined) ?? []
        ).filter((value) => value.isActive);
        return {
          key: `dimension:${type.id}`,
          label: `Dimension: ${type.name}`,
          type: "select" as const,
          options: values.map((value) => ({ label: value.name, value: value.id })),
        };
      });

    const customFields = indexedCustomFields.map((field) => ({
      key: `custom:${field.fieldId}`,
      label: `Custom: ${field.label}`,
      type: field.type === "NUMBER" ? ("number" as const) : ("text" as const),
    }));

    return [
      {
        key: "category",
        label: "Category",
        type: "select",
        options: CATEGORY_OPTIONS.filter((o) => o.value),
      },
      { key: "expenseDate", label: "Date", type: "date" },
      { key: "merchantName", label: "Merchant", type: "text" },
      { key: "totalAmountCents", label: "Amount", type: "number" },
      ...dimensionFields,
      ...customFields,
    ];
  }, [dimensionTypes, dimensionValuesQueries, indexedCustomFields]);

  const filters = useMemo(() => {
    const categoryFilter = state.filters?.find(
      (f) => f.field === "category" && f.operator === "eq"
    );
    return {
      category: categoryFilter ? String(categoryFilter.value) : "",
    };
  }, [state.filters]);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: expenseKeys.list({ ...state }),
    queryFn: () => {
      const dimensionFilters = (state.filters ?? [])
        .filter((filter) => filter.field.startsWith("dimension:") && filter.value)
        .map((filter) => ({
          typeId: filter.field.replace("dimension:", ""),
          valueIds: [String(filter.value)],
        }));

      const customFieldFilters = (state.filters ?? [])
        .filter((filter) => filter.field.startsWith("custom:"))
        .map((filter) => ({
          fieldId: filter.field.replace("custom:", ""),
          operator: filter.operator,
          value: filter.value,
        }));

      return expensesApi.listExpenses({
        q: state.q,
        page: state.page,
        pageSize: state.pageSize,
        sort: state.sort,
        category: filters.category || undefined,
        filters: state.filters,
        dimensionFilters,
        customFieldFilters,
      });
    },
    placeholderData: keepPreviousData,
  });

  const expenses = data?.items ?? [];
  const pageInfo = data?.pageInfo;

  const deleteExpenses = useMutation({
    mutationFn: async (ids: string[]) => {
      await Promise.all(ids.map((id) => expensesApi.deleteExpense(id)));
    },
    onSuccess: async () => {
      toast.success("Expense deleted");
      setSelectedIds(new Set());
      await invalidateResourceQueries(queryClient, "expenses");
    },
    onError: () => toast.error("Failed to delete expense"),
  });

  const toggleSelection = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const allSelected = expenses.length > 0 && expenses.every((e) => selectedIds.has(e.id));

  const bulkDelete = () => {
    if (selectedIds.size === 0) {
      return;
    }
    deleteExpenses.mutate(Array.from(selectedIds));
    setDeleteTarget(null);
  };

  const updateCategory = (val: string) => {
    // Legacy helper, might be unused if we remove the dropdown, but keeping for safely
    const newFilters = (state.filters ?? []).filter((f) => f.field !== "category");
    if (val) {
      newFilters.push({ field: "category", operator: "eq", value: val });
    }
    setUrlState({ filters: newFilters, page: 1 });
  };

  return (
    <>
      <CrudListPageLayout
        title="Expenses"
        subtitle="Track and manage your spend"
        primaryAction={
          <Button
            variant="accent"
            data-testid="create-expense-button"
            onClick={() => navigate("/expenses/new")}
          >
            <Plus className="h-4 w-4" />
            Add expense
          </Button>
        }
        toolbar={
          <ListToolbar
            search={state.q}
            onSearchChange={(v) => setUrlState({ q: v, page: 1 })}
            sort={state.sort}
            onSortChange={(v) => setUrlState({ sort: v })}
            sortOptions={[
              { label: "Date (Newest)", value: "expenseDate:desc" },
              { label: "Date (Oldest)", value: "expenseDate:asc" },
              { label: "Amount (High-Low)", value: "totalCents:desc" },
              { label: "Amount (Low-High)", value: "totalCents:asc" },
              { label: "Created (Newest)", value: "createdAt:desc" },
            ]}
            onFilterClick={() => setIsFilterOpen(true)}
            filterCount={state.filters?.length}
          >
            {isError ? (
              <div className="text-sm text-destructive">
                {(error as Error)?.message || "Failed to load expenses"}
              </div>
            ) : null}
          </ListToolbar>
        }
        filters={
          (state.filters?.length ?? 0) > 0 ? (
            <ActiveFilterChips
              filters={state.filters ?? []}
              onRemove={(f) => {
                const newFilters = state.filters?.filter((x) => x !== f) ?? [];
                setUrlState({ filters: newFilters, page: 1 });
              }}
              onClearAll={() => setUrlState({ filters: [], page: 1 })}
            />
          ) : undefined
        }
      >
        <Card>
          <CardContent className="p-0" data-testid="expenses-list">
            {isLoading ? (
              <div className="space-y-4 p-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-12 w-full animate-pulse rounded bg-muted/20" />
                ))}
              </div>
            ) : expenses.length === 0 ? (
              <EmptyState
                icon={Trash2}
                title="No expenses yet"
                description="Create your first expense to track spending."
                action={
                  <Button variant="outline" onClick={() => setUrlState({ q: "", filters: [] })}>
                    Clear filters
                  </Button>
                }
              />
            ) : (
              <>
                {selectedIds.size > 0 ? (
                  <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/40">
                    <div className="text-sm text-muted-foreground">{selectedIds.size} selected</div>
                    <ConfirmDeleteDialog
                      trigger={
                        <Button variant="destructive" size="sm" disabled={deleteExpenses.isPending}>
                          Delete selected
                        </Button>
                      }
                      title="Delete selected expenses"
                      description="This will archive the selected expenses."
                      isLoading={deleteExpenses.isPending}
                      onConfirm={bulkDelete}
                    />
                  </div>
                ) : null}
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border bg-muted/50">
                        <th className="w-12 px-4 py-3">
                          <Checkbox
                            checked={allSelected}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedIds(new Set(expenses.map((e) => e.id)));
                              } else {
                                setSelectedIds(new Set());
                              }
                            }}
                            aria-label="Select all"
                          />
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                          Date
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                          Merchant
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                          Category
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                          VAT
                        </th>
                        <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                          Amount
                        </th>
                        <th className="w-[50px]"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {expenses.map((expense) => {
                        const vatPercent =
                          expense.taxAmountCents != null && expense.totalAmountCents
                            ? Math.round((expense.taxAmountCents / expense.totalAmountCents) * 100)
                            : null;
                        return (
                          <tr
                            key={expense.id}
                            data-testid={`expense-row-${expense.id}`}
                            className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
                          >
                            <td className="px-4 py-3">
                              <Checkbox
                                checked={selectedIds.has(expense.id)}
                                onCheckedChange={() => toggleSelection(expense.id)}
                                aria-label={`Select expense ${expense.id}`}
                              />
                            </td>
                            <td className="px-4 py-3 text-sm">
                              {formatDate(expense.expenseDate || expense.createdAt, "en-US")}
                            </td>
                            <td className="px-4 py-3 text-sm font-medium">
                              {expense.merchantName || "-"}
                            </td>
                            <td className="px-4 py-3">
                              <Badge variant="muted">
                                {expense.category ? expense.category.replace(/_/g, " ") : "-"}
                              </Badge>
                            </td>
                            <td className="px-4 py-3 text-sm">
                              {vatPercent != null ? `${vatPercent}%` : "-"}
                            </td>
                            <td className="px-4 py-3 text-sm text-right font-medium">
                              {formatMoney(
                                expense.totalAmountCents ?? (expense as any).totalCents ?? 0,
                                "en-US"
                              )}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <CrudRowActions
                                primaryAction={{
                                  label: "View",
                                  href: `/expenses/${expense.id}`,
                                }}
                                secondaryActions={[
                                  {
                                    label: "Edit",
                                    href: `/expenses/${expense.id}/edit`,
                                    icon: <Edit className="h-4 w-4" />,
                                  },
                                  {
                                    label: "Delete",
                                    onClick: () => setDeleteTarget(expense.id),
                                    destructive: true,
                                    icon: <Trash2 className="h-4 w-4" />,
                                    "data-testid": `expense-delete-${expense.id}`,
                                  },
                                ]}
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {pageInfo && (
                  <Pagination className="border-t border-border p-4">
                    <PaginationContent>
                      <PaginationItem>
                        <span className="text-sm text-muted-foreground mr-4">
                          Page {pageInfo.page} of {Math.ceil(pageInfo.total / pageInfo.pageSize)}
                        </span>
                      </PaginationItem>
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
          </CardContent>
        </Card>

        <ConfirmDeleteDialog
          open={deleteTarget !== null}
          onOpenChange={(open: boolean) => !open && setDeleteTarget(null)}
          trigger={null}
          title="Delete expense"
          description="This will archive the expense and remove it from the list."
          isLoading={deleteExpenses.isPending}
          onConfirm={() => {
            if (deleteTarget) {
              deleteExpenses.mutate([deleteTarget]);
            }
            setDeleteTarget(null);
          }}
        />
      </CrudListPageLayout>
      <FilterPanel
        open={isFilterOpen}
        onOpenChange={setIsFilterOpen}
        filters={state.filters ?? []}
        onApply={(newFilters) => setUrlState({ filters: newFilters, page: 1 })}
        fields={filterFields}
      />
    </>
  );
}
