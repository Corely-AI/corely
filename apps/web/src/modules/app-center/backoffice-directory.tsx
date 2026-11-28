import { useUiCopy } from "@corely/web-shared/shared/i18n/ui-copy";
import React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";
import { AppCatalogItemSchema, isSafeSsoReturnPath, type AppCatalogItem } from "@corely/contracts";
import { apiClient } from "@corely/web-shared/lib/api-client";
import { useWorkspace } from "@corely/web-shared/shared/workspaces/workspace-provider";
import { getActiveWorkspaceId } from "@corely/web-shared/shared/workspaces/workspace-store";
import { useAuth } from "@corely/web-shared/lib/auth-provider";
import { AppDirectory } from "./app-directory";
import { appCenterLocale, copy } from "./copy";

function modulePath(app: AppCatalogItem) {
  if (!app.enabled) {
    return undefined;
  }
  const path = app.directory?.path ?? app.directory?.destination?.path;
  if (path && isSafeSsoReturnPath(path)) {
    return path;
  }
  if (app.launch?.availability === "available") {
    if (app.launch.launchId === "invoice") {
      return "/invoices";
    }
    if (app.launch.launchId === "hr") {
      return "/people/staff";
    }
  }
  return undefined;
}

export function BackofficeDirectory() {
  const uiCopy = useUiCopy("ui.app-center-backoffice-directory");
  const { activeWorkspaceId } = useWorkspace();
  const { user } = useAuth();
  const { i18n } = useTranslation();
  const locale = appCenterLocale(i18n.language ?? "en");
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const queryKey = ["backoffice-directory", user?.userId, user?.activeTenantId, activeWorkspaceId];
  const query = useQuery({
    queryKey,
    enabled: !!activeWorkspaceId,
    queryFn: async ({ signal }) =>
      AppCatalogItemSchema.array().parse(await apiClient.request("/menu/launches", {}, { signal })),
  });
  const [launchError, setLaunchError] = React.useState(false);
  const search = activeWorkspaceId
    ? new URLSearchParams({ workspaceId: activeWorkspaceId }).toString()
    : "";
  async function launch(id: string) {
    setLaunchError(false);
    const previousUpdate = queryClient.getQueryState(queryKey)?.dataUpdateCount ?? 0;
    const result = await query.refetch();
    if (getActiveWorkspaceId() !== activeWorkspaceId) {
      return;
    }
    if (result.isError) {
      setLaunchError(true);
      return;
    }
    // A canceled refresh can resolve to cached data without updating the query.
    const update = queryClient.getQueryState(queryKey)?.dataUpdateCount ?? 0;
    if (update <= previousUpdate) {
      return;
    }
    const app = result.data?.find((item) => item.appId === id);
    const path = app && modulePath(app);
    if (path) {
      navigate({ pathname: path, search });
    } else {
      setLaunchError(true);
    }
  }
  return (
    <main className="space-y-6 p-6">
      <h1 className="text-3xl font-semibold">{copy[locale].title}</h1>
      <AppDirectory
        apps={query.data ?? []}
        workspaceId={activeWorkspaceId ?? ""}
        locale={locale}
        entryUrl={modulePath}
        loading={query.isLoading}
        error={query.isError}
        launching={query.isFetching}
        launchError={launchError}
        onRetry={() => {
          setLaunchError(false);
          void query.refetch();
        }}
        onLaunch={(id) => void launch(id)}
      />
      {query.data?.some((app) => app.appId === "booking" && modulePath(app)) && (
        <Link className="underline" to={{ pathname: "/openbuk/app", search }}>
          {uiCopy("openbuk-studio")}
        </Link>
      )}
    </main>
  );
}
