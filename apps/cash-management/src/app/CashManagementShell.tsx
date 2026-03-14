import React from "react";
import type { WorkspaceNavigationGroup, WorkspaceNavigationItem } from "@corely/contracts";
import { AppShell, type AppSidebarProps, type WorkspaceSwitcherMode } from "@corely/web-shared";
import { assistantFeature, cashManagementFeature, type FeatureNavItem } from "@corely/web-features";

const cashManagementSwitcherMode: WorkspaceSwitcherMode = "multi";

const cashManagementNavItems: FeatureNavItem[] = [
  ...cashManagementFeature.cashManagementNavItems,
  ...assistantFeature.assistantNavItems,
  { id: "settings", label: "Settings", route: "/settings", icon: "Settings" },
];

const toWorkspaceNavigationItem = (
  item: FeatureNavItem,
  index: number
): WorkspaceNavigationItem => ({
  id: item.id,
  section: "cash-management",
  label: item.label,
  route: item.route,
  icon: item.icon ?? "HelpCircle",
  order: index + 1,
  exact: item.route === "/dashboard",
});

const cashManagementNavigationGroups: WorkspaceNavigationGroup[] = [
  {
    id: "cash-management",
    labelKey: "nav.cashManagement",
    defaultLabel: "Cash Management",
    order: 1,
    items: cashManagementNavItems.map(toWorkspaceNavigationItem),
  },
];

const cashManagementSidebarProps: Omit<AppSidebarProps, "variant" | "collapsed" | "onToggle"> = {
  showPlatformAdminNav: false,
  showWorkspaceTypeBadge: false,
  workspaceSwitcherMode: cashManagementSwitcherMode,
};

export const CashManagementShell = () => {
  return (
    <AppShell
      navigationGroups={cashManagementNavigationGroups}
      sidebarProps={cashManagementSidebarProps}
      includeWorkspaceQuickActions={false}
    />
  );
};
