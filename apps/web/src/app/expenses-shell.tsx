import React, { useMemo } from "react";
import { Receipt } from "lucide-react";
import { useTranslation } from "react-i18next";
import { AppShell } from "@corely/web-shared";
import { Button } from "@corely/ui";
import { useWorkspaceConfig } from "@corely/web-shared/shared/workspaces/workspace-config-provider";
import { useWorkspace } from "@corely/web-shared/shared/workspaces/workspace-provider";
import { isFocusedRoute } from "@corely/web-shared/layout/focused-shell-navigation";
import { focusedShellCopy } from "@corely/web-shared/layout/focused-shell-copy";
import { workspaceLaunchUrl } from "@corely/web-shared/session/workspace-launch";

/** Reuse the authorized Expenses screens and transport within the existing web surface. */
export function ExpensesShell() {
  const { t, i18n } = useTranslation();
  const { navigationGroups, isLoading, error } = useWorkspaceConfig();
  const { activeWorkspaceId } = useWorkspace();
  const locale = i18n.language.startsWith("de")
    ? "de"
    : i18n.language.startsWith("vi")
      ? "vi"
      : "en";
  const groups = useMemo(
    () =>
      isLoading || error
        ? []
        : navigationGroups
            .map((group) => ({
              ...group,
              items: group.items.filter(
                (item) =>
                  item.id === "expenses" &&
                  typeof item.route === "string" &&
                  isFocusedRoute(item.route, ["/expenses"])
              ),
            }))
            .filter((group) => group.items.length > 0),
    [navigationGroups, isLoading, error]
  );
  const appCenterOrigin = import.meta.env.VITE_CORELY_APP_CENTER_ORIGIN;
  const returnUrl =
    appCenterOrigin && activeWorkspaceId
      ? workspaceLaunchUrl(appCenterOrigin, activeWorkspaceId)
      : undefined;
  const allAppsUrl = returnUrl ? new URL(returnUrl) : undefined;
  allAppsUrl?.searchParams.set("lang", locale);
  return (
    <AppShell
      navigationGroups={groups}
      isConfigLoading={isLoading}
      configError={error}
      includeWorkspaceQuickActions={false}
      sidebarProps={{
        showPlatformAdminNav: false,
        showWorkspaceTypeBadge: false,
        logo: (
          <span className="flex items-center gap-2 font-semibold">
            <Receipt className="h-5 w-5" aria-hidden="true" />
            {t("nav.expenses")}
          </span>
        ),
      }}
      topContent={
        <header className="flex min-h-14 flex-wrap items-center justify-between gap-3 border-b px-6 py-3">
          <span className="font-semibold">{t("nav.expenses")}</span>
          {allAppsUrl && (
            <Button asChild variant="outline">
              <a href={allAppsUrl.href}>{focusedShellCopy[locale].allApps}</a>
            </Button>
          )}
        </header>
      }
    />
  );
}
