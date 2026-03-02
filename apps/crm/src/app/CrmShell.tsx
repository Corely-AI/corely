import React from "react";
import type { WorkspaceNavigationGroup, WorkspaceNavigationItem } from "@corely/contracts";
import { AppShell, type AppSidebarProps, type WorkspaceSwitcherMode } from "@corely/web-shared";
import { assistantFeature, crmFeature, type FeatureNavItem } from "@corely/web-features";

const crmSwitcherMode: WorkspaceSwitcherMode = "multi";

const dashboardNavItem = crmFeature.crmManifestNavItems.find((item) => item.id === "crm-dashboard");
const crmItemsWithoutDashboard = crmFeature.crmManifestNavItems.filter(
  (item) => item.id !== "crm-dashboard"
);

const crmNavItems: FeatureNavItem[] = [
  ...(dashboardNavItem ? [dashboardNavItem] : []),
  ...assistantFeature.assistantNavItems,
  ...crmItemsWithoutDashboard,
];

const toWorkspaceNavigationItem = (
  item: FeatureNavItem,
  index: number
): WorkspaceNavigationItem => ({
  id: item.id,
  section: "crm",
  label: item.label,
  route: item.route,
  icon: item.icon ?? "HelpCircle",
  order: index + 1,
  exact: item.route === "/crm",
});

const crmNavigationGroups: WorkspaceNavigationGroup[] = [
  {
    id: "crm",
    labelKey: "CRM",
    defaultLabel: "CRM",
    order: 1,
    items: crmNavItems.map(toWorkspaceNavigationItem),
  },
];

const crmSidebarProps: Omit<AppSidebarProps, "variant" | "collapsed" | "onToggle"> = {
  showPlatformAdminNav: false,
  showWorkspaceTypeBadge: false,
  workspaceSwitcherMode: crmSwitcherMode,
};

export const CrmShell = () => {
  return (
    <AppShell
      navigationGroups={crmNavigationGroups}
      sidebarProps={crmSidebarProps}
      includeWorkspaceQuickActions={false}
    />
  );
};
