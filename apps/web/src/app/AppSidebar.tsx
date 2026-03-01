import React from "react";
import {
  AppSidebar as SharedAppSidebar,
  type AppSidebarProps as SharedAppSidebarProps,
} from "@corely/web-shared";
import { useTaxCapabilitiesQuery } from "@/modules/tax/hooks/useTaxCapabilitiesQuery";
import { NotificationBell } from "@/modules/notifications/components/notification-bell";
import { useWorkspaceConfig } from "@/shared/workspaces/workspace-config-provider";

export type AppSidebarProps = SharedAppSidebarProps;

export function AppSidebar(props: AppSidebarProps) {
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
      navigationGroups={navigationGroups}
      isConfigLoading={isConfigLoading}
      configError={configError}
      hiddenItemIds={hiddenItemIds}
      notificationBell={<NotificationBell />}
    />
  );
}
