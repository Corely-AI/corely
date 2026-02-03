import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react"; // Used in error state
import { Button } from "@corely/ui";
import { Card, CardContent, CardHeader, CardTitle } from "@corely/ui";
import { Separator } from "@corely/ui";
import { expensesApi } from "@/lib/expenses-api";
import { expenseKeys } from "../queries";
import { formatDate, formatMoney } from "@/shared/lib/formatters";
import { Skeleton } from "@/shared/components/Skeleton";
import { invalidateResourceQueries } from "@/shared/crud";
import { toast } from "sonner";
import { RecordCommandBar } from "@/shared/components/RecordCommandBar";

export const ExpenseDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const {
    data: queryResult,
    isLoading,
    isError,
  } = useQuery({
    queryKey: expenseKeys.detail(id ?? ""),
    queryFn: () => (id ? expensesApi.getExpense(id) : Promise.reject(new Error("Missing id"))),
    enabled: Boolean(id),
  });

  const { expense, capabilities } = queryResult || {};
  const [isProcessing] = React.useState(false);

  // Handle transitions (placeholder for future API)
  const handleTransition = React.useCallback(async (to: string) => {
    toast.info(`Transition to ${to} is coming soon`);
  }, []);

  // Handle actions
  const handleAction = React.useCallback(
    async (actionKey: string) => {
      if (!id) {
        return;
      }
      switch (actionKey) {
        case "edit":
          navigate(`/expenses/${id}/edit`);
          break;
        case "delete":
          deleteMutation.mutate(id);
          break;
        default:
          toast.info(`Action ${actionKey} coming soon`);
      }
    },
    [id, navigate]
  );

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
      <div className="mb-6">
        {capabilities ? (
          <RecordCommandBar
            title={expense.merchantName || "Expense"}
            subtitle={formatDate(expense.expenseDate || expense.createdAt, "en-US")}
            capabilities={capabilities}
            onBack={() => navigate("/expenses")}
            onTransition={handleTransition}
            onAction={handleAction}
            isLoading={isProcessing || deleteMutation.isPending}
          />
        ) : (
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/expenses")}>
              <span className="text-lg">←</span>
            </Button>
            <h1 className="text-h1 text-foreground">{expense.merchantName || "Expense"}</h1>
          </div>
        )}
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
