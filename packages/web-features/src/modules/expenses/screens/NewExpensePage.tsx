import React, { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { UploadFileOutput } from "@corely/contracts";
import { Button } from "@corely/ui";
import { Card, CardContent } from "@corely/ui";
import { Skeleton } from "@corely/web-shared/shared/components/Skeleton";
import { apiClient } from "@corely/web-shared/lib/api-client";
import { expensesApi } from "@corely/web-shared/lib/expenses-api";
import { ExpenseForm, type ExpenseFormValues } from "../components/ExpenseForm";
import { expenseKeys } from "../queries";
import { invalidateResourceQueries } from "@corely/web-shared/shared/crud";
import { toast } from "sonner";
import {
  CustomAttributesSection,
  type CustomAttributesValue,
} from "@corely/web-shared/shared/custom-attributes";

const fileToBase64 = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || "");
      const base64 = result.includes(",") ? result.split(",")[1] : result;
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

const uploadExpenseReceipt = async (file: File): Promise<string> => {
  const base64 = await fileToBase64(file);
  const result = await apiClient.post<UploadFileOutput>("/documents/upload-base64", {
    filename: file.name,
    contentType: file.type || "application/octet-stream",
    base64,
    purpose: "expense-receipt",
  });
  return result.document.id;
};

const linkDocumentToExpense = async (documentId: string, expenseId: string): Promise<void> => {
  await apiClient.post(`/documents/${documentId}/link`, {
    entityType: "EXPENSE",
    entityId: expenseId,
  });
};

type SaveExpensePayload = {
  values: ExpenseFormValues;
  receiptFiles: File[];
};

export default function NewExpensePage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: queryResult, isLoading } = useQuery({
    queryKey: expenseKeys.detail(id ?? ""),
    queryFn: () => (id ? expensesApi.getExpense(id) : Promise.resolve(null)),
    enabled: isEdit,
  });

  const expense = queryResult && "expense" in queryResult ? queryResult.expense : null;
  const [customAttributes, setCustomAttributes] = React.useState<CustomAttributesValue | undefined>(
    undefined
  );

  const mutation = useMutation({
    mutationFn: async ({ values, receiptFiles }: SaveExpensePayload) => {
      const totalAmountCents = Math.round(parseFloat(values.amount || "0") * 100);

      // Build DE deductibility meta from form extras
      const deductibilityMeta: Record<string, unknown> = {};
      if (values.participants) {
        deductibilityMeta.participants = values.participants;
      }
      if (values.occasion) {
        deductibilityMeta.occasion = values.occasion;
      }
      if (values.recipient) {
        deductibilityMeta.recipient = values.recipient;
      }
      if (values.businessUsePercent != null) {
        deductibilityMeta.businessUsePercent = values.businessUsePercent;
      }
      if (values.homeOfficeDays != null) {
        deductibilityMeta.homeOfficeDays = values.homeOfficeDays;
      }
      if (values.travelDate) {
        deductibilityMeta.travelMeta = {
          date: values.travelDate,
          absenceHours: values.absenceHours ?? undefined,
          country: "DE",
        };
      }

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
        customFieldValues: customAttributes?.customFieldValues,
        dimensionAssignments: customAttributes?.dimensionAssignments,
        deductibilityMeta: Object.keys(deductibilityMeta).length ? deductibilityMeta : undefined,
      };
      const savedExpense = await (isEdit && id
        ? expensesApi.updateExpense(id, payload)
        : expensesApi.createExpense(payload));

      const failedReceipts: string[] = [];

      if (receiptFiles.length > 0) {
        for (const file of receiptFiles) {
          try {
            const documentId = await uploadExpenseReceipt(file);
            await linkDocumentToExpense(documentId, savedExpense.id);
          } catch {
            failedReceipts.push(file.name);
          }
        }
      }

      return { savedExpense, failedReceipts };
    },
    onSuccess: async ({ savedExpense, failedReceipts }) => {
      const successMessage = isEdit
        ? t("expenses.notifications.updated")
        : t("expenses.notifications.created");
      if (failedReceipts.length === 0) {
        toast.success(successMessage);
      } else {
        toast.warning(
          t("expenses.notifications.receiptAttachPartial", {
            successMessage,
            count: failedReceipts.length,
          })
        );
      }
      await invalidateResourceQueries(queryClient, "expenses", { id: savedExpense.id });
      navigate(`/expenses/${savedExpense.id}`);
    },
    onError: () => toast.error(t("expenses.notifications.saveFailed")),
  });

  const defaultValues: ExpenseFormValues | undefined = useMemo(() => {
    if (!expense) {
      return undefined;
    }
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
          <h1 className="text-h1 text-foreground">
            {isEdit ? t("expenses.form.editTitle") : t("expenses.addExpense")}
          </h1>
        </div>
        <Button variant="outline" onClick={() => navigate("/expenses")}>
          {t("common.cancel")}
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
          onSubmit={(values, extras) =>
            mutation.mutate({ values, receiptFiles: extras.receiptFiles })
          }
          onCancel={() => navigate("/expenses")}
          isSubmitting={mutation.isPending}
          submitLabel={isEdit ? t("common.saveChanges") : t("expenses.form.create")}
        />
      )}

      <CustomAttributesSection
        entityType="expense"
        entityId={isEdit ? id : undefined}
        mode="edit"
        onChange={setCustomAttributes}
      />
    </div>
  );
}
