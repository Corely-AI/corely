import { LoadingSkeleton, Button, EmptyState } from "@corely/ui";
import { CrudListPageLayout } from "@corely/web-shared/shared/crud/CrudListPageLayout";
import { getIconByName } from "@corely/web-shared/shared/utils/iconMapping";
import React, { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { SignOverviewSchema, SignRuntimeSettingsSchema } from "@corely/contracts";
import { useWorkspace } from "@corely/web-shared/shared/workspaces/workspace-provider";
import { useAuth } from "@corely/web-shared/lib/auth-provider";
import { apiClient } from "@corely/web-shared/lib/api-client";
export default function OverviewPage({ focused = false }: { focused?: boolean } = {}) {
  const { user } = useAuth(),
    { activeWorkspaceId } = useWorkspace(),
    { pathname } = useLocation();
  if (!user?.activeTenantId || !activeWorkspaceId) {
    return null;
  }
  return (
    <Content
      key={JSON.stringify([user.userId, user.activeTenantId, activeWorkspaceId, pathname])}
      workspace={activeWorkspaceId}
      focused={focused}
      settings={pathname.endsWith("/settings")}
    />
  );
}
function Content({
  workspace,
  settings,
  focused,
}: {
  workspace: string;
  settings: boolean;
  focused: boolean;
}) {
  const { t } = useTranslation();
  const [counts, setCounts] = useState<ReturnType<typeof SignOverviewSchema.parse>>(),
    [config, setConfig] = useState<ReturnType<typeof SignRuntimeSettingsSchema.parse>>(),
    [error, setError] = useState(""),
    [attempt, retry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setError("");
    void apiClient
      .request(
        settings ? "/sign/settings" : "/sign/overview",
        { headers: { "X-Workspace-Id": workspace } },
        { workspaceScope: "none", signal: controller.signal }
      )
      .then((data) => {
        if (!controller.signal.aborted) {
          if (settings) {
            setConfig(SignRuntimeSettingsSchema.parse(data));
          } else {
            setCounts(SignOverviewSchema.parse(data));
          }
        }
      })
      .catch((e) => {
        if (!controller.signal.aborted) {
          setError(String(e));
        }
      });
    return () => controller.abort();
  }, [workspace, settings, attempt]);
  return (
    <CrudListPageLayout
      title={settings ? t("sign.settings") : "Corely Sign"}
      primaryAction={
        !settings && (
          <Button variant="accent" asChild>
            <Link to="/sign/requests/new">{t("sign.prepareRequest")}</Link>
          </Button>
        )
      }
      toolbar={
        !focused && (
          <nav className="flex flex-wrap gap-4">
            {[
              ["/sign", "sign.overview"],
              ["/sign/requests", "sign.requests"],
              ["/sign/templates", "sign.templates"],
              ["/sign/settings", "sign.settings"],
            ].map(([path, key]) => (
              <Link key={path} to={path} className="underline">
                {t(key)}
              </Link>
            ))}
          </nav>
        )
      }
    >
      {error ? (
        <p role="alert" className="flex flex-wrap items-center gap-3 p-5 text-destructive">
          {error}{" "}
          <Button variant="outline" onClick={() => retry(attempt + 1)}>
            {t("sign.retry")}
          </Button>
        </p>
      ) : settings ? (
        config ? (
          <dl className="divide-y px-5">
            {Object.entries(config).map(([key, value]) => (
              <div key={key} className="flex flex-wrap justify-between gap-2 py-4 text-sm">
                <dt>{t("sign." + key)}</dt>
                <dd className="break-all font-medium">
                  {typeof value === "boolean" ? t(value ? "sign.yes" : "sign.no") : (value ?? "—")}
                </dd>
              </div>
            ))}
          </dl>
        ) : (
          <LoadingSkeleton label={t("common.loading")} variant="list" className="p-5" />
        )
      ) : counts ? (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-5 py-3">
            <h2 className="font-semibold">{t("sign.requests")}</h2>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/sign/requests">{t("common.viewAll")}</Link>
            </Button>
          </div>
          {counts.length ? (
            <dl className="grid gap-3 p-4 sm:grid-cols-3">
              {counts.map((c) => (
                <div className="rounded-lg border border-border bg-muted/30 p-4" key={c.status}>
                  <dt>
                    <Link
                      className="text-sm font-medium text-muted-foreground hover:text-foreground hover:underline"
                      to={"/sign/requests?status=" + c.status}
                    >
                      {t("sign.states." + c.status)}
                    </Link>
                  </dt>
                  <dd className="mt-2 text-2xl font-semibold tabular-nums">{c.total}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <EmptyState
              icon={getIconByName("FileSignature")}
              title={t("sign.noRequests")}
              description={t("sign.firstRequestHint")}
              action={
                <Button variant="outline" asChild>
                  <Link to="/sign/templates">{t("sign.templates")}</Link>
                </Button>
              }
            />
          )}
        </>
      ) : (
        <LoadingSkeleton label={t("common.loading")} variant="cards" className="p-5" />
      )}
    </CrudListPageLayout>
  );
}
