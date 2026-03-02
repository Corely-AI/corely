import React from "react";
import type { WorkspaceNavigationGroup, WorkspaceNavigationItem } from "@corely/contracts";
import { AppShell, type AppSidebarProps, type WorkspaceSwitcherMode } from "@corely/web-shared";
import { assistantFeature, crmFeature, type FeatureNavItem } from "@corely/web-features";

const crmSwitcherMode: WorkspaceSwitcherMode = "multi";

const crmNavItems: FeatureNavItem[] = [
  { id: "overview", label: "Overview", route: "/overview", icon: "Home" },
  ...assistantFeature.assistantNavItems,
  ...crmFeature.crmManifestNavItems,
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
  exact: item.route === "/overview",
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
