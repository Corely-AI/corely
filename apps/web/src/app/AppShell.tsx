import React from "react";
import { useLocation } from "react-router-dom";
import { AppShell as SharedAppShell } from "@corely/web-shared";
import { useSurfaceId } from "@corely/web-shared/shared/surface";
import { useTaxCapabilitiesQuery } from "@/modules/tax/hooks/useTaxCapabilitiesQuery";
import { useWorkspaceConfig } from "@/shared/workspaces/workspace-config-provider";
import { TenantAdminSessionBanner } from "../modules/platform/screens/tenant-management/tenant-admin-session-banner";
import { AppSidebar } from "./AppSidebar";
import { resolveBackofficeNavigation } from "./backoffice-navigation";

const hiddenTaxPaymentItems = ["tax-payments"];

export function AppShell() {
  const { pathname } = useLocation();
  const surfaceId = useSurfaceId();
  const { navigationGroups, isLoading } = useWorkspaceConfig();
  const navigation = React.useMemo(
    () => resolveBackofficeNavigation(pathname, navigationGroups, surfaceId),
    [pathname, navigationGroups, surfaceId]
  );
  const hasTaxPayments = navigation.groups.some((group) =>
    group.items.some((item) => item.id === "tax-payments")
  );
  const { data: taxCapabilities } = useTaxCapabilitiesQuery(!isLoading && hasTaxPayments);
  return (
    <SharedAppShell
      navigationGroups={navigation.groups}
      includeWorkspaceQuickActions={navigation.scope === "workspace"}
      sidebarProps={{
        showPlatformAdminNav: navigation.scope === "workspace",
        hiddenItemIds: taxCapabilities?.paymentsEnabled ? undefined : hiddenTaxPaymentItems,
      }}
      topContent={<TenantAdminSessionBanner />}
      renderSidebar={(props) => <AppSidebar {...props} />}
    />
  );
}
