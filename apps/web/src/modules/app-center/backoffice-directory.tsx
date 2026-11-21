import React from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";
import { AppCatalogItemSchema, isSafeSsoReturnPath, type AppCatalogItem } from "@corely/contracts";
import { apiClient } from "@corely/web-shared/lib/api-client";
import { useWorkspace } from "@corely/web-shared/shared/workspaces/workspace-provider";
import { useAuth } from "@corely/web-shared/lib/auth-provider";
import { AppDirectory } from "./app-directory";
import { appCenterLocale, copy } from "./copy";

function modulePath(app: AppCatalogItem) {
  if (!app.enabled) {
    return undefined;
  }
  const path = app.directory?.destination?.path;
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
  const { activeWorkspaceId } = useWorkspace();
  const { user } = useAuth();
  const { i18n } = useTranslation();
  const locale = appCenterLocale(i18n.language ?? "en");
  const navigate = useNavigate();
  const query = useQuery({
    queryKey: ["backoffice-directory", user?.userId, user?.activeTenantId, activeWorkspaceId],
    enabled: !!activeWorkspaceId,
    queryFn: async ({ signal }) =>
      AppCatalogItemSchema.array().parse(await apiClient.request("/menu/launches", {}, { signal })),
  });
  const [launchError, setLaunchError] = React.useState(false);
  async function launch(id: string) {
    const result = await query.refetch();
    const app = result.data?.find((item) => item.appId === id);
    const path = !result.isError && app && modulePath(app);
    if (path) {
      navigate(path);
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
        <Link className="underline" to="/openbuk/app">
          OpenBuk Studio
        </Link>
      )}
    </main>
  );
}
