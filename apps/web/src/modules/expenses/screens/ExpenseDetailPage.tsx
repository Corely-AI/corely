import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";
import { Separator } from "@/shared/ui/separator";
import { expensesApi } from "@/lib/expenses-api";
import { expenseKeys } from "../queries";
import { formatDate, formatMoney } from "@/shared/lib/formatters";
import { Skeleton } from "@/shared/components/Skeleton";
import { ConfirmDeleteDialog, invalidateResourceQueries } from "@/shared/crud";
import { toast } from "sonner";

export const ExpenseDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const {
    data: expense,
    isLoading,
    isError,
  } = useQuery({
    queryKey: expenseKeys.detail(id ?? ""),
    queryFn: () => (id ? expensesApi.getExpense(id) : Promise.reject(new Error("Missing id"))),
    enabled: Boolean(id),
  });

  const deleteMutation = useMutation({
    mutationFn: (expenseId: string) => expensesApi.deleteExpense(expenseId),
    onSuccess: async () => {
      toast.success("Expense deleted");
      await invalidateResourceQueries(queryClient, "expenses", { id });
      navigate("/expenses");
    },
    onError: () => toast.error("Failed to delete expense"),
  });

  if (isLoading) {
    return (
      <div className="p-6 lg:p-8 space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (isError || !expense) {
    return (
      <div className="p-6 lg:p-8 space-y-4">
        <Button variant="ghost" onClick={() => navigate("/expenses")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to expenses
        </Button>
        <Card>
          <CardContent className="p-6">
            <p className="text-destructive">Expense not found.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const vatPercent =
    expense.taxAmountCents != null && expense.totalAmountCents
      ? Math.round((expense.taxAmountCents / expense.totalAmountCents) * 100)
      : null;

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/expenses")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-h1 text-foreground">
              {expense.merchantName || "Expense"}{" "}
              <Badge variant="secondary" className="ml-2">
                {expense.status ?? "SUBMITTED"}
              </Badge>
            </h1>
            <p className="text-muted-foreground text-sm">
              {formatDate(expense.expenseDate || expense.createdAt, "en-US")}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => navigate(`/expenses/${expense.id}/edit`)}>
            <Pencil className="h-4 w-4 mr-2" />
            Edit
          </Button>
          <ConfirmDeleteDialog
            trigger={
              <Button variant="destructive">
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            }
            title="Delete expense"
            description="This will archive the expense. You can restore it later."
            isLoading={deleteMutation.isPending}
            onConfirm={() => {
              if (id) {
                deleteMutation.mutate(id);
              }
            }}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Overview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Merchant</p>
                <p className="font-medium">{expense.merchantName ?? "—"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Category</p>
                <p className="font-medium">{expense.category ?? "—"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Amount</p>
                <p className="font-medium">{formatMoney(expense.totalAmountCents ?? 0, "en-US")}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">VAT</p>
                <p className="font-medium">{vatPercent != null ? `${vatPercent}%` : "—"}</p>
              </div>
            </div>
            <Separator />
            <div>
              <p className="text-sm text-muted-foreground">Notes</p>
              <p className="text-sm mt-1">{expense.notes ?? "No notes added."}</p>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Receipts</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Attach receipts to see them here.
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Activity</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Audit trail will appear here once available.
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
