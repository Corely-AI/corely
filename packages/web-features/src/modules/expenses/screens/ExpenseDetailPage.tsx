import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ShieldCheck, ShieldOff, ShieldAlert } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@corely/ui";
import { Card, CardContent, CardHeader, CardTitle } from "@corely/ui";
import { Badge } from "@corely/ui";
import { Separator } from "@corely/ui";
import { expensesApi } from "@corely/web-shared/lib/expenses-api";
import { expenseKeys } from "../queries";
import { formatDate, formatMoney } from "@corely/web-shared/shared/lib/formatters";
import { Skeleton } from "@corely/web-shared/shared/components/Skeleton";
import { invalidateResourceQueries } from "@corely/web-shared/shared/crud";
import { toast } from "sonner";
import { DetailScreenHeader } from "@corely/web-shared/shared/components/DetailScreenHeader";
import { CustomAttributesSection } from "@corely/web-shared/shared/custom-attributes";
import type { ExpenseDeductibilityResult } from "@corely/contracts";

// ---------------------------------------------------------------------------
// Deductibility summary sub-component
// ---------------------------------------------------------------------------

const RULE_KIND_LABEL: Record<string, string> = {
  PERCENT: "expenses.detail.ruleKind.percent",
  GIFT_THRESHOLD_PER_RECIPIENT_YEAR: "expenses.detail.ruleKind.giftThreshold",
  PER_DIEM: "expenses.detail.ruleKind.perDiem",
  MIXED_USE: "expenses.detail.ruleKind.mixedUse",
};

function DeductibilitySummary({ d, locale }: { d: ExpenseDeductibilityResult; locale: string }) {
  const { t } = useTranslation();
  const { deductiblePercent, deductibleAmountCents, nonDeductibleAmountCents, ruleKind } = d;

  const isKnown = deductiblePercent != null;
  const Icon = !isKnown ? ShieldAlert : deductiblePercent === 0 ? ShieldOff : ShieldCheck;
  const iconClass = !isKnown
    ? "text-amber-500"
    : deductiblePercent === 0
      ? "text-red-500"
      : deductiblePercent === 100
        ? "text-green-600"
        : "text-amber-500";

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Icon className={`h-5 w-5 ${iconClass}`} />
        <span className="font-semibold text-sm">
          {isKnown
            ? t("expenses.detail.deductiblePercentLabel", { percent: deductiblePercent })
            : t("expenses.detail.needsMoreInfo")}
        </span>
        {ruleKind ? (
          <Badge variant="muted" className="text-xs">
            {t(RULE_KIND_LABEL[ruleKind] ?? ruleKind)}
          </Badge>
        ) : null}
      </div>

      {isKnown ? (
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-muted-foreground">{t("expenses.detail.deductible")}</p>
            <p className="font-medium text-green-700">
              {formatMoney(deductibleAmountCents ?? 0, locale)}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">{t("expenses.detail.nonDeductible")}</p>
            <p className="font-medium text-red-600">
              {formatMoney(nonDeductibleAmountCents ?? 0, locale)}
            </p>
          </div>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">{t("expenses.detail.fillRequiredFields")}</p>
      )}
    </div>
  );
}

export const ExpenseDetailPage = () => {
  const { t, i18n } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const {
    data: queryResult,
    isLoading,
    isError,
  } = useQuery({
    queryKey: expenseKeys.detail(id ?? ""),
    queryFn: () => (id ? expensesApi.getExpense(id) : Promise.reject(new Error(t("common.error")))),
    enabled: Boolean(id),
  });

  const { expense, capabilities } = queryResult || {};
  const [isProcessing] = React.useState(false);

  // Handle transitions (placeholder for future API)
  const handleTransition = React.useCallback(
    async (to: string) => {
      toast.info(t("expenses.detail.transitionSoon", { to }));
    },
    [t]
  );

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
          toast.info(t("expenses.detail.actionSoon", { action: actionKey }));
      }
    },
    [id, navigate, t]
  );

  const deleteMutation = useMutation({
    mutationFn: (expenseId: string) => expensesApi.deleteExpense(expenseId),
    onSuccess: async () => {
      toast.success(t("expenses.notifications.deleted"));
      await invalidateResourceQueries(queryClient, "expenses", { id });
      navigate("/expenses");
    },
    onError: () => toast.error(t("expenses.notifications.deleteFailed")),
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
          {t("expenses.detail.backToExpenses")}
        </Button>
        <Card>
          <CardContent className="p-6">
            <p className="text-destructive">{t("expenses.detail.notFound")}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const vatPercent =
    expense.taxAmountCents != null && expense.totalAmountCents
      ? Math.round((expense.taxAmountCents / expense.totalAmountCents) * 100)
      : null;

  const deductibility = (expense as any).deductibility as
    | ExpenseDeductibilityResult
    | null
    | undefined;

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="mb-6">
        {capabilities ? (
          <DetailScreenHeader
            title={expense.merchantName || t("expenses.title")}
            subtitle={formatDate(expense.expenseDate || expense.createdAt, i18n.language)}
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
            <h1 className="text-h1 text-foreground">
              {expense.merchantName || t("expenses.title")}
            </h1>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>{t("expenses.detail.overview")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">{t("expenses.merchant")}</p>
                <p className="font-medium">{expense.merchantName ?? "—"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t("expenses.category")}</p>
                <p className="font-medium">
                  {expense.category
                    ? t(`expenses.categories.${expense.category}`, {
                        defaultValue: expense.category,
                      })
                    : "—"}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t("expenses.amount")}</p>
                <p className="font-medium">
                  {formatMoney(expense.totalAmountCents ?? 0, i18n.language)}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t("expenses.vat")}</p>
                <p className="font-medium">{vatPercent != null ? `${vatPercent}%` : "—"}</p>
              </div>
            </div>
            <Separator />
            <div>
              <p className="text-sm text-muted-foreground">{t("common.notes")}</p>
              <p className="text-sm mt-1">{expense.notes ?? t("expenses.detail.noNotes")}</p>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          {/* DE Tax Deductibility Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold">
                {t("expenses.detail.taxDeductibility")}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {deductibility ? (
                <DeductibilitySummary d={deductibility} locale={i18n.language} />
              ) : (
                <p className="text-sm text-muted-foreground">{t("expenses.detail.notComputed")}</p>
              )}
            </CardContent>
          </Card>

          <CustomAttributesSection entityType="expense" entityId={expense.id} mode="read" />
          <Card>
            <CardHeader>
              <CardTitle>{t("expenses.receipt")}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              {t("expenses.detail.attachReceipts")}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>{t("crm.activities.title")}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              {t("expenses.detail.auditTrail")}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
