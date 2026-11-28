import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { OperationsBriefingSchema } from "@corely/contracts";
import { Button, Card, CardContent, LoadingSkeleton } from "@corely/ui";
import { apiClient } from "@corely/web-shared/lib/api-client";
import { useAuth } from "@corely/web-shared/lib/auth-provider";
import { useWorkspace } from "@corely/web-shared/shared/workspaces/workspace-provider";
import { useWorkspaceConfig } from "@corely/web-shared/shared/workspaces/workspace-config-provider";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import briefingStrings from "./operations-briefing-copy.json";
import todayStrings from "./operations-today-copy.json";

const path = "/operations/today/briefing";
const ephemeral = { gcTime: 0, networkMode: "always", meta: { persist: false } } as const;

export function OperationsBriefingPage() {
  const { user } = useAuth();
  const { activeWorkspaceId } = useWorkspace();
  const { hasCapability, isLoading } = useWorkspaceConfig();
  return (
    <Briefing
      key={JSON.stringify([user?.activeTenantId, user?.userId, activeWorkspaceId])}
      workspaceId={activeWorkspaceId ?? ""}
      enabled={Boolean(activeWorkspaceId && user?.userId && hasCapability("ai.copilot"))}
      isLoading={isLoading}
    />
  );
}

function Briefing({
  workspaceId,
  enabled,
  isLoading,
}: {
  workspaceId: string;
  enabled: boolean;
  isLoading: boolean;
}) {
  const { i18n } = useTranslation();
  const locale = i18n.resolvedLanguage ?? i18n.language ?? "en";
  const language = locale.split("-")[0];
  const copy =
    language === "de"
      ? briefingStrings.de
      : language === "vi"
        ? briefingStrings.vi
        : briefingStrings.en;
  const today =
    language === "de" ? todayStrings.de : language === "vi" ? todayStrings.vi : todayStrings.en;
  const headers = { "X-Workspace-Id": workspaceId, "Content-Type": "application/json" };
  const [checkedAt, setCheckedAt] = useState(0);
  const generate = useMutation({
    ...ephemeral,
    mutationFn: async () =>
      OperationsBriefingSchema.parse(
        await apiClient.request(
          path,
          { method: "POST", headers, cache: "no-store" },
          { workspaceScope: "none" }
        )
      ),
    onSuccess: () => setCheckedAt(Date.now()),
  });
  const feedback = useMutation({
    ...ephemeral,
    mutationFn: (outcome: "useful" | "needs-review") =>
      apiClient.request(
        path + "/feedback",
        {
          method: "POST",
          headers,
          body: JSON.stringify({
            outcome,
            reviewMs: Math.min(600_000, Math.max(0, Date.now() - checkedAt)),
          }),
        },
        { workspaceScope: "none", parseJson: false }
      ),
  });
  const result = enabled ? generate.data : undefined;
  const status =
    !enabled || generate.isError
      ? copy.unavailable
      : result && result.status !== "ready"
        ? copy[result.status]
        : undefined;
  const snapshot = result && result.status !== "unavailable" ? result : undefined;
  const formatTime = (value: string, timezone: string) =>
    new Intl.DateTimeFormat(locale, {
      timeStyle: "short",
      timeZone: timezone,
    }).format(new Date(value));
  return (
    <section className="mx-auto max-w-4xl space-y-5 p-4 sm:p-6" aria-labelledby="briefing-title">
      <Link className="text-sm text-primary underline" to="/today">
        {today.title}
      </Link>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 id="briefing-title" className="text-2xl font-semibold">
          {copy.title}
        </h1>
        {enabled && (
          <Button
            disabled={generate.isPending || feedback.isPending}
            onClick={() => {
              feedback.reset();
              generate.mutate();
            }}
          >
            {copy.generate}
          </Button>
        )}
      </div>
      {(isLoading || generate.isPending) && <LoadingSkeleton label={copy.loading} variant="list" />}
      {!isLoading && status && (
        <p role="status" className="rounded-xl border border-border bg-card p-4">
          {status}
        </p>
      )}
      {snapshot && (
        <p className="text-sm text-muted-foreground">
          {today.asOf}{" "}
          <time dateTime={snapshot.checkedAt}>
            {formatTime(snapshot.checkedAt, snapshot.timezone)}
          </time>
          {" · "}
          {snapshot.date}
          {" · "}
          {snapshot.timezone}
        </p>
      )}
      {result?.status === "ready" && (
        <Card>
          <CardContent className="space-y-3 p-4">
            <ol className="divide-y divide-border">
              {result.entries.map((entry) => (
                <li
                  key={entry.kind + entry.href}
                  className="flex flex-wrap items-center justify-between gap-2 py-3"
                >
                  <Link className="text-primary underline" to={entry.href}>
                    {copy[entry.kind]}
                  </Link>
                  <time className="text-sm text-muted-foreground" dateTime={entry.at}>
                    {formatTime(entry.at, result.timezone)}
                  </time>
                </li>
              ))}
            </ol>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={feedback.isPending || feedback.isSuccess}
                onClick={() => feedback.mutate("useful")}
              >
                {copy.useful}
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={feedback.isPending || feedback.isSuccess}
                onClick={() => feedback.mutate("needs-review")}
              >
                {copy.review}
              </Button>
            </div>
            {feedback.isSuccess && (
              <p role="status" className="text-sm">
                {copy.feedbackSaved}
              </p>
            )}
            {feedback.isError && (
              <p role="alert" className="text-sm text-destructive">
                {copy.feedbackFailed}
              </p>
            )}
          </CardContent>
        </Card>
      )}
      {snapshot && snapshot.sources.some((source) => source.status !== "fresh") && (
        <ul className="space-y-2 rounded-xl border border-border bg-card p-4 text-sm">
          {snapshot.sources
            .filter((source) => source.status !== "fresh")
            .map((source) => (
              <li key={source.kind}>
                <span className="font-semibold">{today[source.kind]}</span>
                {" · "}
                {today[source.status]}
                {source.observedAt && (
                  <>
                    {" "}
                    <time dateTime={source.observedAt}>
                      {formatTime(source.observedAt, snapshot.timezone)}
                    </time>
                  </>
                )}
              </li>
            ))}
        </ul>
      )}
    </section>
  );
}
