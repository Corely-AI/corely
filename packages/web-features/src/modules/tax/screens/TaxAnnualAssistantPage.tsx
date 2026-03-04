import React from "react";
import { useMutation } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { Alert, AlertDescription, AlertTitle, Button, Card, CardContent } from "@corely/ui";
import { Loader2, Sigma, ListChecks, FileCheck } from "lucide-react";
import { createCopilotThread } from "@corely/web-shared/lib/copilot-api";
import { Chat } from "@corely/web-shared/shared/components/Chat";
import { getActiveWorkspaceId } from "@corely/web-shared/shared/workspaces/workspace-store";
import { useTranslation } from "react-i18next";

const resolveYear = (rawYear: string | undefined): number => {
  const parsed = Number.parseInt(rawYear ?? "", 10);
  if (Number.isFinite(parsed) && parsed >= 2000 && parsed <= 2100) {
    return parsed;
  }
  return new Date().getUTCFullYear();
};

export default function TaxAnnualAssistantPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { year: yearParam, threadId } = useParams<{ year?: string; threadId?: string }>();
  const year = resolveYear(yearParam);
  const activeWorkspaceId = getActiveWorkspaceId() ?? undefined;

  const createThreadMutation = useMutation({
    mutationFn: async () =>
      createCopilotThread({
        title: t("tax.annualAssistant.threadTitle", { year }),
        metadata: {
          taxAnnual: {
            workspaceId: activeWorkspaceId,
            taxYear: year,
            jurisdiction: "DE",
            strategy: "PERSONAL",
          },
        },
      }),
    onSuccess: (newThreadId) => {
      navigate(`/tax/annual/${year}/t/${newThreadId}`, { replace: true });
    },
  });

  React.useEffect(() => {
    if (threadId || createThreadMutation.isPending || createThreadMutation.isSuccess) {
      return;
    }
    createThreadMutation.mutate();
  }, [
    threadId,
    createThreadMutation.isPending,
    createThreadMutation.isSuccess,
    createThreadMutation.mutate,
  ]);

  if (!threadId) {
    return (
      <div className="p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
        <Card>
          <CardContent className="py-10 text-sm text-muted-foreground flex items-center gap-3">
            <Loader2 className="h-4 w-4 animate-spin" />
            {t("tax.annualAssistant.loading")}
          </CardContent>
        </Card>
        {createThreadMutation.isError ? (
          <Alert variant="destructive">
            <AlertTitle>{t("tax.annualAssistant.errors.createTitle")}</AlertTitle>
            <AlertDescription className="space-y-3">
              <p>{t("tax.annualAssistant.errors.createDescription")}</p>
              <Button variant="outline" onClick={() => createThreadMutation.mutate()}>
                {t("tax.center.retry")}
              </Button>
            </AlertDescription>
          </Alert>
        ) : null}
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-3.5rem)] lg:h-screen">
      <Chat
        activeModule="tax"
        runId={threadId}
        runIdMode="controlled"
        placeholder={t("tax.annualAssistant.placeholder")}
        emptyStateTitle={t("tax.annualAssistant.emptyStateTitle", { year })}
        emptyStateDescription={t("tax.annualAssistant.emptyStateDescription")}
        suggestions={[
          {
            icon: Sigma,
            label: t("tax.annualAssistant.suggestions.createDraft.label"),
            value: t("tax.annualAssistant.suggestions.createDraft.value", { year }),
          },
          {
            icon: ListChecks,
            label: t("tax.annualAssistant.suggestions.checklist.label"),
            value: t("tax.annualAssistant.suggestions.checklist.value"),
          },
          {
            icon: FileCheck,
            label: t("tax.annualAssistant.suggestions.export.label"),
            value: t("tax.annualAssistant.suggestions.export.value"),
          },
        ]}
        onRunIdResolved={(resolvedRunId) => {
          if (resolvedRunId !== threadId) {
            navigate(`/tax/annual/${year}/t/${resolvedRunId}`, { replace: true });
          }
        }}
      />
    </div>
  );
}
