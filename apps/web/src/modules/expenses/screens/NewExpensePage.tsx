import React, { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Card, CardContent } from "@/shared/ui/card";
import { Skeleton } from "@/shared/components/Skeleton";
import { expensesApi } from "@/lib/expenses-api";
import { ExpenseForm, type ExpenseFormValues } from "../components/ExpenseForm";
import { expenseKeys } from "../queries";
import { invalidateResourceQueries } from "@/shared/crud";
import { toast } from "sonner";

export default function NewExpensePage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: expense, isLoading } = useQuery({
    queryKey: expenseKeys.detail(id ?? ""),
    queryFn: () => (id ? expensesApi.getExpense(id) : Promise.resolve(null)),
    enabled: isEdit,
  });

  const mutation = useMutation({
    mutationFn: async (values: ExpenseFormValues) => {
      const totalAmountCents = Math.round(parseFloat(values.amount || "0") * 100);
      const payload = {
        merchantName: values.merchantName,
        expenseDate: values.expenseDate,
        totalAmountCents,
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore - keep legacy compatibility
        totalCents: totalAmountCents,
        currency: values.currency,
        category: values.category,
        notes: values.notes,
        vatRate: values.vatRate ? Number(values.vatRate) : undefined,
      };
      return isEdit && id
        ? expensesApi.updateExpense(id, payload)
        : expensesApi.createExpense(payload);
    },
    onSuccess: async (saved) => {
      toast.success(isEdit ? "Expense updated" : "Expense created");
      await invalidateResourceQueries(queryClient, "expenses", { id: saved.id });
      navigate(`/expenses/${saved.id}`);
    },
    onError: () => toast.error("Failed to save expense"),
  });

  const defaultValues: ExpenseFormValues | undefined = useMemo(() => {
    if (!expense) {return undefined;}
    return {
      merchantName: expense.merchantName ?? "",
      expenseDate: expense.expenseDate ?? new Date().toISOString().slice(0, 10),
      amount: ((expense.totalAmountCents ?? 0) / 100).toFixed(2),
      currency: expense.currency,
      category: expense.category ?? undefined,
      vatRate:
        expense.taxAmountCents && expense.totalAmountCents
          ? String(Math.round((expense.taxAmountCents / expense.totalAmountCents) * 100))
          : "0",
      notes: expense.notes ?? "",
    };
  }, [expense]);

  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/expenses")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-h1 text-foreground">{isEdit ? "Edit expense" : "Add expense"}</h1>
        </div>
        <Button variant="outline" onClick={() => navigate("/expenses")}>
          Cancel
        </Button>
      </div>

      {isEdit && isLoading ? (
        <Card>
          <CardContent className="p-6">
            <Skeleton className="h-6 w-48 mb-4" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      ) : (
        <ExpenseForm
          key={expense?.id ?? "new-expense"}
          defaultValues={defaultValues}
          onSubmit={(values) => mutation.mutate(values)}
          onCancel={() => navigate("/expenses")}
          isSubmitting={mutation.isPending}
          submitLabel={isEdit ? "Save changes" : "Create expense"}
        />
      )}
    </div>
  );
}
