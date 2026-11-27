import React from "react";
import { useLocation } from "react-router-dom";
import { AppShell as SharedAppShell } from "@corely/web-shared";
import { useSurfaceId } from "@corely/web-shared/shared/surface";
import { useTaxCapabilitiesQuery } from "@/modules/tax/hooks/useTaxCapabilitiesQuery";
import { useWorkspaceConfig } from "@/shared/workspaces/workspace-config-provider";
import { TenantAdminSessionBanner } from "../modules/platform/screens/tenant-management/tenant-admin-session-banner";
import { AppSidebar } from "./AppSidebar";
import { resolveBackofficeNavigation } from "./backoffice-navigation";

export function AppShell() {
  const { pathname, search } = useLocation();
  const surfaceId = useSurfaceId();
  const { navigationGroups, isLoading } = useWorkspaceConfig();
  const navigation = React.useMemo(
    () => resolveBackofficeNavigation(pathname, search, navigationGroups, surfaceId),
    [pathname, search, navigationGroups, surfaceId]
  );
  const hasTaxPayments = navigation.groups.some((group) =>
    group.items.some((item) => item.id === "tax-payments")
  );
  const { data: taxCapabilities } = useTaxCapabilitiesQuery(!isLoading && hasTaxPayments);
  const groups = React.useMemo(() => {
    if (!hasTaxPayments || taxCapabilities?.paymentsEnabled) {
      return navigation.groups;
    }
    return navigation.groups
      .map((group) => ({
        ...group,
        items: group.items.filter((item) => item.id !== "tax-payments"),
      }))
      .filter((group) => group.items.length > 0);
  }, [hasTaxPayments, navigation.groups, taxCapabilities?.paymentsEnabled]);

  return (
    <SharedAppShell
      navigationGroups={groups}
      includeWorkspaceQuickActions={navigation.scope === "workspace"}
      sidebarProps={{ showPlatformAdminNav: navigation.scope === "workspace" }}
      topContent={<TenantAdminSessionBanner />}
      renderSidebar={(props) => <AppSidebar {...props} />}
    />
  );
}
