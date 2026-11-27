import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { normalizeError } from "@corely/api-client";
import type { ExpenseReceiptDraft, ExpenseReceiptDraftFields } from "@corely/contracts";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Input, Label } from "@corely/ui";
import { expenseReceiptEmailApi } from "@corely/web-shared/lib/expense-receipt-email-api";
import { workspacesApi } from "@corely/web-shared/shared/workspaces/workspaces-api";
import { ExternalLink } from "lucide-react";
import { useTranslation } from "react-i18next";
import { DE_EXPENSE_CATEGORIES } from "./expense-form.config";
import { Link } from "react-router-dom";

type Props = {
  draft: ExpenseReceiptDraft;
  workspaceId: string;
  canReview: boolean;
  onChange(draft: ExpenseReceiptDraft): void;
};

const blank = (value: string) => value.trim() || null;

export function ReceiptDraftForm({ draft, workspaceId, canReview, onChange }: Props) {
  const { t } = useTranslation();
  const [fields, setFields] = useState({
    merchant: draft.merchant ?? "",
    expenseDate: draft.expenseDate ?? "",
    amount: draft.amountCents == null ? "" : (draft.amountCents / 100).toFixed(2),
    currency: draft.currency ?? "",
    category: draft.category ?? "",
  });
  const [assignee, setAssignee] = useState("");
  const [amountError, setAmountError] = useState(false);
  const needsAssignment = !draft.claimantUserId;
  const members = useQuery({
    queryKey: ["expense-receipt-claimants", workspaceId],
    queryFn: () => workspacesApi.listMembers(workspaceId),
    enabled: canReview && needsAssignment,
  });
  const update = useMutation({
    mutationFn: ({ input, submit }: { input: ExpenseReceiptDraftFields; submit: boolean }) =>
      expenseReceiptEmailApi.update(draft.id, input, submit),
    onSuccess: onChange,
  });
  const assign = useMutation({
    mutationFn: () => expenseReceiptEmailApi.assign(draft.id, assignee),
    onSuccess: onChange,
  });
  const original = useMutation({ mutationFn: () => expenseReceiptEmailApi.original(draft.id) });

  const openOriginal = () => {
    const tab = window.open("about:blank", "_blank");
    if (tab) {
      tab.opener = null;
    }
    original.mutate(undefined, {
      onSuccess: ({ url }) => (tab ? tab.location.replace(url) : window.location.assign(url)),
      onError: () => tab?.close(),
    });
  };
  const save = (submit: boolean) => {
    const value = fields.amount.trim();
    if (
      value &&
      (!/^\d+(?:\.\d{1,2})?$/.test(value) || Number(value) <= 0 || Number(value) > 21474836.47)
    ) {
      setAmountError(true);
      return;
    }
    setAmountError(false);
    update.mutate({
      submit,
      input: {
        merchant: blank(fields.merchant),
        expenseDate: blank(fields.expenseDate),
        amountCents: value ? Math.round(Number(value) * 100) : null,
        currency: blank(fields.currency.toUpperCase()),
        category: blank(fields.category),
      },
    });
  };
  const edit = (field: keyof typeof fields, value: string) =>
    setFields((current) => ({ ...current, [field]: value }));
  const error = update.error ?? assign.error ?? original.error ?? members.error;

  return (
    <Card>
      <CardHeader className="gap-3">
        <CardTitle className="break-all">{draft.filename}</CardTitle>
        <div className="flex flex-wrap items-center gap-3">
          <Badge>
            {t(
              draft.submittedExpenseId
                ? "expenses.receiptEmail.submitted"
                : "expenses.receiptEmail.draft"
            )}
          </Badge>
          <Button
            type="button"
            variant="outline"
            disabled={original.isPending}
            onClick={openOriginal}
          >
            <ExternalLink className="h-4 w-4" />
            {t("expenses.receiptEmail.original")}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {normalizeError(error).detail}
          </p>
        )}
        {draft.submittedExpenseId ? (
          <Button asChild variant="outline">
            <Link to={`/expenses/${draft.submittedExpenseId}`}>
              {t("expenses.receiptEmail.viewExpense")}
            </Link>
          </Button>
        ) : needsAssignment ? (
          <div className="space-y-3">
            <Label htmlFor="receipt-assignee">{t("expenses.receiptEmail.assignTo")}</Label>
            <select
              id="receipt-assignee"
              value={assignee}
              onChange={(event) => setAssignee(event.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">{t("expenses.receiptEmail.chooseMember")}</option>
              {members.data?.members
                .filter((member) => member.status === "ACTIVE")
                .map((member) => (
                  <option key={member.userId} value={member.userId}>
                    {member.name || member.email || member.userId}
                  </option>
                ))}
            </select>
            <Button disabled={!assignee || assign.isPending} onClick={() => assign.mutate()}>
              {t("expenses.receiptEmail.assign")}
            </Button>
          </div>
        ) : (
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              save(true);
            }}
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="receipt-merchant">{t("expenses.merchant")}</Label>
                <Input
                  id="receipt-merchant"
                  value={fields.merchant}
                  onChange={(event) => edit("merchant", event.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="receipt-date">{t("expenses.date")}</Label>
                <Input
                  id="receipt-date"
                  type="date"
                  value={fields.expenseDate}
                  onChange={(event) => edit("expenseDate", event.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="receipt-amount">{t("expenses.amount")}</Label>
                <Input
                  id="receipt-amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={fields.amount}
                  onChange={(event) => edit("amount", event.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="receipt-currency">{t("expenses.receiptEmail.currency")}</Label>
                <Input
                  id="receipt-currency"
                  maxLength={3}
                  placeholder="EUR"
                  value={fields.currency}
                  onChange={(event) => edit("currency", event.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="receipt-category">{t("expenses.category")}</Label>
                <select
                  id="receipt-category"
                  value={fields.category}
                  onChange={(event) => edit("category", event.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">{t("expenses.receiptEmail.chooseCategory")}</option>
                  {DE_EXPENSE_CATEGORIES.map((option) => (
                    <option key={option.value} value={option.value}>
                      {t(option.labelKey)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {amountError && <p role="alert">{t("expenses.receiptEmail.invalidAmount")}</p>}
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={update.isPending}
                onClick={() => save(false)}
              >
                {t("expenses.receiptEmail.saveDraft")}
              </Button>
              <Button
                type="submit"
                disabled={update.isPending || Object.values(fields).some((value) => !value.trim())}
              >
                {t("expenses.receiptEmail.submit")}
              </Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
