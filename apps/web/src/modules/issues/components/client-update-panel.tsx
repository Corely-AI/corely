import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Button, Card, CardContent, Label, Textarea } from "@corely/ui";
import type { Issue } from "@corely/contracts";
import { issuesApi } from "@/lib/issues-api";

export function ClientUpdatePanel({
  issue,
  refresh,
}: {
  issue: Issue;
  refresh: () => Promise<unknown>;
}) {
  const { t } = useTranslation();
  const [summary, setSummary] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const mutation = useMutation({
    mutationFn: (input: { recipient: string; summary: string }) =>
      issuesApi.sendClientUpdate(issue.id, input),
    onSuccess: refresh,
  });
  const status = issue.clientUpdateStatus;
  const canSend = (!status || status === "FAILED") && ["RESOLVED", "CLOSED"].includes(issue.status);

  return (
    <Card>
      <CardContent className="space-y-3 p-5">
        <h2 className="text-lg font-semibold">{t("requests.clientUpdate")}</h2>
        <p className="break-all text-sm">{issue.clientEmail}</p>
        {status && (
          <p role="status" className="text-sm">
            {t("requests.delivery." + status)}
          </p>
        )}
        {canSend && issue.clientEmail && (
          <form
            className="space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              if (!confirmed || !issue.clientEmail) {return;}
              mutation.mutate({
                recipient: issue.clientEmail,
                summary: issue.clientUpdateSummary ?? summary.trim(),
              });
            }}
          >
            <Label htmlFor="client-summary">{t("requests.summary")}</Label>
            <Textarea
              id="client-summary"
              required
              maxLength={8000}
              value={issue.clientUpdateSummary ?? summary}
              readOnly={Boolean(issue.clientUpdateSummary)}
              onChange={(event) => setSummary(event.target.value)}
            />
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(event) => setConfirmed(event.target.checked)}
              />
              {t("requests.confirmRecipient")}
            </label>
            <Button type="submit" disabled={!confirmed || mutation.isPending}>
              {t(status === "FAILED" ? "requests.retry" : "requests.send")}
            </Button>
            {mutation.isError && (
              <p className="text-destructive" role="alert">
                {t("requests.sendFailed")}
              </p>
            )}
          </form>
        )}
      </CardContent>
    </Card>
  );
}
