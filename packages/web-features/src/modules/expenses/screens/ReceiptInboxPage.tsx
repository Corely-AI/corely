import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Badge, Button, Card, CardContent } from "@corely/ui";
import type { ExpenseReceiptDraft } from "@corely/contracts";
import { expenseReceiptEmailApi } from "@corely/web-shared/lib/expense-receipt-email-api";
import { useWorkspace } from "@corely/web-shared/shared/workspaces/workspace-provider";
import { useAuth } from "@corely/web-shared/lib/auth-provider";
import { formatDateTime } from "@corely/web-shared/shared/lib/formatters";
import { ReceiptDraftForm } from "../components/ReceiptDraftForm";

function ReceiptInbox({ workspaceId }: { workspaceId: string }) {
  const { t, i18n } = useTranslation();
  const [params, setParams] = useSearchParams();
  const selected = params.get("receipt");
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [cursors, setCursors] = useState<string[]>([]);
  const after = cursors.at(-1);
  const listKey = ["expense-receipts", workspaceId];
  const list = useQuery({
    queryKey: [...listKey, after],
    queryFn: () => expenseReceiptEmailApi.list(after),
    retry: false,
  });
  const draftKey = ["expense-receipt", workspaceId, selected];
  const draft = useQuery({
    queryKey: draftKey,
    queryFn: () => expenseReceiptEmailApi.get(selected ?? ""),
    enabled: Boolean(selected),
    retry: false,
  });

  const choose = (id?: string) => {
    const next = new URLSearchParams(params);
    if (id) {
      next.set("receipt", id);
    } else {
      next.delete("receipt");
    }
    setParams(next);
  };

  const changed = (value: ExpenseReceiptDraft) => {
    if (value.claimantUserId !== user?.userId) {
      choose();
    } else {
      queryClient.setQueryData(draftKey, value);
    }
    void queryClient.invalidateQueries({ queryKey: listKey });
  };

  const next = list.data?.nextCursor;
  return (
    <main className="space-y-5 p-6 lg:p-8">
      <header className="flex flex-wrap items-center gap-4">
        <Button asChild variant="ghost" size="icon">
          <Link to="/expenses" aria-label={t("expenses.title")}>
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <h1 className="text-h1">{t("expenses.receiptEmail.inbox")}</h1>
      </header>
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(220px,1fr)_2fr]">
        <Card>
          <CardContent className="space-y-3 p-4">
            {list.isPending && <p role="status">{t("expenses.receiptEmail.loading")}</p>}
            {list.isError && <p role="alert">{t("expenses.receiptEmail.loadFailed")}</p>}
            {list.data?.items.length === 0 && <p>{t("expenses.receiptEmail.empty")}</p>}
            <ul className="space-y-2">
              {list.data?.items.map((item) => (
                <li key={item.id}>
                  <Button
                    variant={selected === item.id ? "secondary" : "ghost"}
                    aria-pressed={selected === item.id}
                    className="h-auto w-full flex-col items-start gap-1 whitespace-normal p-3 text-left"
                    onClick={() => choose(item.id)}
                  >
                    <span className="break-all">{item.filename}</span>
                    <span className="text-xs text-muted-foreground">
                      {formatDateTime(item.receivedAt, i18n.t("common.locale"))}
                    </span>
                    <Badge>
                      {t(
                        item.submittedExpenseId
                          ? "expenses.receiptEmail.submitted"
                          : item.claimantUserId
                            ? "expenses.receiptEmail.draft"
                            : "expenses.receiptEmail.unassigned"
                      )}
                    </Badge>
                  </Button>
                </li>
              ))}
            </ul>
            {(next || after) && (
              <div className="flex justify-between gap-2">
                <Button
                  variant="outline"
                  disabled={!after}
                  onClick={() => setCursors((items) => items.slice(0, -1))}
                >
                  {t("expenses.receiptEmail.previous")}
                </Button>
                <Button
                  variant="outline"
                  disabled={!next}
                  onClick={() => next && setCursors((items) => [...items, next])}
                >
                  {t("expenses.receiptEmail.next")}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
        {selected && draft.isPending && <p role="status">{t("expenses.receiptEmail.loading")}</p>}
        {draft.isError && <p role="alert">{t("expenses.receiptEmail.loadFailed")}</p>}
        {draft.data && (
          <ReceiptDraftForm
            key={draft.data.id}
            draft={draft.data}
            workspaceId={workspaceId}
            canReview={Boolean(list.data?.canReview)}
            onChange={changed}
          />
        )}
      </div>
    </main>
  );
}

export default function ReceiptInboxPage() {
  const { activeWorkspaceId } = useWorkspace();
  return activeWorkspaceId ? (
    <ReceiptInbox key={activeWorkspaceId} workspaceId={activeWorkspaceId} />
  ) : null;
}
