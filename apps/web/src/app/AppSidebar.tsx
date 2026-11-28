import React from "react";
import { Link, useLocation } from "react-router-dom";
import { LayoutGrid } from "lucide-react";
import { useTranslation } from "react-i18next";
import { appCenterLocale, copy } from "../modules/app-center/copy";
import {
  settingsDestinations,
  settingsOverviewPath,
} from "../modules/settings/settings-navigation";
import {
  AppSidebar as SharedAppSidebar,
  type AppSidebarProps as SharedAppSidebarProps,
} from "@corely/web-shared";
import { cn } from "@corely/web-shared/shared/lib/utils";
import { useWorkspace } from "@corely/web-shared/shared/workspaces/workspace-provider";

export type AppSidebarProps = SharedAppSidebarProps & { showSettingsNavigation?: boolean };

export function AppSidebar({ showSettingsNavigation, ...props }: AppSidebarProps) {
  const { t, i18n } = useTranslation();
  const locale = appCenterLocale(i18n.language ?? "en");
  const { activeWorkspaceId } = useWorkspace();
  const { pathname, hash } = useLocation();
  const currentDestination = pathname === settingsOverviewPath ? `${pathname}${hash}` : pathname;

  return (
    <SharedAppSidebar
      {...props}
      renderNavigationChildren={(item) =>
        showSettingsNavigation && item.route === settingsOverviewPath ? (
          <ul
            aria-label={t("settings.title")}
            className="ms-5 space-y-1 border-s border-sidebar-border ps-2"
          >
            {settingsDestinations(Boolean(activeWorkspaceId)).map(({ to, label }) => {
              const isCurrent = currentDestination === to;
              return (
                <li key={to}>
                  <Link
                    to={to}
                    onClick={props.onNavigate}
                    aria-current={isCurrent ? "location" : undefined}
                    className={cn(
                      "flex min-h-10 items-center rounded-lg px-3 py-2 text-sm",
                      isCurrent
                        ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                        : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                    )}
                  >
                    {t(label)}
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : null
      }
      directoryLink={
        <Link
          to="/apps"
          onClick={props.onNavigate}
          title={copy[locale].title}
          className="flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-sidebar-accent"
        >
          <LayoutGrid size={16} aria-hidden="true" />
          <span className={props.collapsed ? "sr-only" : undefined}>{copy[locale].title}</span>
        </Link>
      }
    />
  );
}
