import React from "react";
import { useLocation } from "react-router-dom";
import { AppShell as SharedAppShell } from "@corely/web-shared";
import { useWorkspaceConfig } from "@/shared/workspaces/workspace-config-provider";
import { TenantAdminSessionBanner } from "../modules/platform/screens/tenant-management/tenant-admin-session-banner";
import { AppSidebar } from "./AppSidebar";
import { resolveBackofficeNavigation } from "./backoffice-navigation";

export function AppShell() {
  const { pathname, search } = useLocation();
  const { navigationGroups } = useWorkspaceConfig();
  const navigation = React.useMemo(
    () => resolveBackofficeNavigation(pathname, search, navigationGroups),
    [pathname, search, navigationGroups]
  );

  return (
    <SharedAppShell
      navigationGroups={navigation.groups}
      includeWorkspaceQuickActions={navigation.scope === "workspace"}
      sidebarProps={{ showPlatformAdminNav: navigation.scope === "workspace" }}
      topContent={<TenantAdminSessionBanner />}
      renderSidebar={(props) => <AppSidebar {...props} />}
    />
  );
}
