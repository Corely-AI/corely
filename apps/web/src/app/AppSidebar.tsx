import React from "react";
import { Link } from "react-router-dom";
import { LayoutGrid } from "lucide-react";
import { useTranslation } from "react-i18next";
import { appCenterLocale, copy } from "../modules/app-center/copy";
import {
  AppSidebar as SharedAppSidebar,
  type AppSidebarProps as SharedAppSidebarProps,
} from "@corely/web-shared";
import { useTaxCapabilitiesQuery } from "@/modules/tax/hooks/useTaxCapabilitiesQuery";
import { useWorkspaceConfig } from "@/shared/workspaces/workspace-config-provider";

export type AppSidebarProps = SharedAppSidebarProps;

export function AppSidebar(props: AppSidebarProps) {
  const { i18n } = useTranslation();
  const locale = appCenterLocale(i18n.language ?? "en");
  const { isLoading: isConfigLoading, error: configError, navigationGroups } = useWorkspaceConfig();

  const hasTaxNav = React.useMemo(
    () =>
      navigationGroups.some((group) => group.items.some((item) => item.route?.startsWith("/tax"))),
    [navigationGroups]
  );
  const { data: taxCapabilities } = useTaxCapabilitiesQuery(!isConfigLoading && hasTaxNav);
  const paymentsEnabled = taxCapabilities?.paymentsEnabled ?? false;
  const hiddenItemIds = paymentsEnabled ? [] : ["tax-payments"];

  return (
    <SharedAppSidebar
      {...props}
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
      navigationGroups={navigationGroups}
      isConfigLoading={isConfigLoading}
      configError={configError}
      hiddenItemIds={hiddenItemIds}
    />
  );
}
