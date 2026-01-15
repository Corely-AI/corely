import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import { Input } from "@/shared/ui/input";
import { Checkbox } from "@/shared/ui/checkbox";
import { EmptyState } from "@/shared/components/EmptyState";
import { formatMoney, formatDate } from "@/shared/lib/formatters";
import { expensesApi } from "@/lib/expenses-api";
import {
  CrudListPageLayout,
  CrudRowActions,
  ConfirmDeleteDialog,
  useCrudUrlState,
  invalidateResourceQueries,
} from "@/shared/crud";
import { expenseKeys } from "../queries";
import { toast } from "sonner";

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
  const [listState, setListState] = useCrudUrlState({ pageSize: 10 });

  const filters = useMemo(() => listState.filters ?? {}, [listState.filters]);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: expenseKeys.list({ ...listState }),
    queryFn: () =>
      expensesApi.listExpenses({
        q: listState.q,
        page: listState.page,
        pageSize: listState.pageSize,
        category: typeof filters.category === "string" ? filters.category : undefined,
      }),
  });

  const expenses = data?.items ?? [];

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
    if (selectedIds.size === 0) {return;}
    deleteExpenses.mutate(Array.from(selectedIds));
    setDeleteTarget(null);
  };

  const categoryValue = typeof filters.category === "string" ? filters.category : "";

  const toolbar = (
    <div className="flex flex-wrap items-center gap-3">
      <div className="relative">
        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search expenses"
          className="pl-8 w-64"
          defaultValue={listState.q ?? ""}
          onChange={(event) => setListState({ q: event.target.value, page: 1 })}
        />
      </div>
      <select
        className="h-10 rounded-md border border-input bg-background px-3 text-sm"
        value={categoryValue}
        onChange={(event) =>
          setListState({
            filters: {
              ...filters,
              category: event.target.value || undefined,
            },
            page: 1,
          })
        }
      >
        {CATEGORY_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {isError ? (
        <div className="text-sm text-destructive">
          {(error as Error)?.message || "Failed to load expenses"}
        </div>
      ) : null}
    </div>
  );

  const primaryAction = (
    <Button
      variant="accent"
      data-testid="create-expense-button"
      onClick={() => navigate("/expenses/new")}
    >
      <Plus className="h-4 w-4" />
      Add expense
    </Button>
  );

  return (
    <CrudListPageLayout
      title="Expenses"
      subtitle="Track and manage your spend"
      primaryAction={primaryAction}
      toolbar={toolbar}
    >
      <Card>
        <CardContent className="p-0" data-testid="expenses-list">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">Loading expenses...</div>
          ) : expenses.length === 0 ? (
            <EmptyState
              icon={Trash2}
              title="No expenses yet"
              description="Create your first expense to track spending."
              action={primaryAction}
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
                      <th className="text-left text-sm font-medium text-muted-foreground px-4 py-3">
                        Date
                      </th>
                      <th className="text-left text-sm font-medium text-muted-foreground px-4 py-3">
                        Merchant
                      </th>
                      <th className="text-left text-sm font-medium text-muted-foreground px-4 py-3">
                        Category
                      </th>
                      <th className="text-left text-sm font-medium text-muted-foreground px-4 py-3">
                        VAT
                      </th>
                      <th className="text-right text-sm font-medium text-muted-foreground px-4 py-3">
                        Amount
                      </th>
                      <th />
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
              {data?.pageInfo ? (
                <div className="flex items-center justify-between px-4 py-3 border-t border-border text-sm text-muted-foreground">
                  <div>
                    Page {data.pageInfo.page} · {data.pageInfo.total} total
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={listState.page <= 1}
                      onClick={() => setListState({ page: Math.max(1, listState.page - 1) })}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={!data.pageInfo.hasNextPage}
                      onClick={() => setListState({ page: listState.page + 1 })}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              ) : null}
            </>
          )}
        </CardContent>
      </Card>
      <ConfirmDeleteDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) {setDeleteTarget(null);}
        }}
        trigger={null}
        title="Delete expense"
        description="This will archive the expense and remove it from the list."
        isLoading={deleteExpenses.isPending}
        onConfirm={() => {
          if (!deleteTarget) {return;}
          deleteExpenses.mutate([deleteTarget]);
          setDeleteTarget(null);
        }}
      />
    </CrudListPageLayout>
  );
}
