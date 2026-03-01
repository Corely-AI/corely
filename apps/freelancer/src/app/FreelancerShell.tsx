import React from "react";
import type { WorkspaceNavigationGroup, WorkspaceNavigationItem } from "@corely/contracts";
import { AppShell, type AppSidebarProps, type WorkspaceSwitcherMode } from "@corely/web-shared";
import {
  assistantFeature,
  crmFeature,
  expensesFeature,
  invoicesFeature,
  portfolioFeature,
  taxFeature,
  type FeatureNavItem,
} from "@corely/web-features";

const freelancerSwitcherMode: WorkspaceSwitcherMode = "multi";

const freelancerNavItems: FeatureNavItem[] = [
  { id: "overview", label: "Overview", route: "/overview", icon: "Home" },
  ...assistantFeature.assistantNavItems,
  ...crmFeature.crmNavItems,
  ...invoicesFeature.invoicesNavItems,
  ...expensesFeature.expensesNavItems,
  ...taxFeature.taxNavItems,
  ...portfolioFeature.portfolioNavItems,
  { id: "settings", label: "Settings", route: "/settings", icon: "Settings" },
];

const toWorkspaceNavigationItem = (
  item: FeatureNavItem,
  index: number
): WorkspaceNavigationItem => ({
  id: item.id,
  section: "freelancer",
  label: item.label,
  route: item.route,
  icon: item.icon ?? "HelpCircle",
  order: index + 1,
  exact: item.route === "/overview",
});

const freelancerNavigationGroups: WorkspaceNavigationGroup[] = [
  {
    id: "freelancer",
    labelKey: "nav.groups.freelancer",
    defaultLabel: "Freelancer",
    order: 1,
    items: freelancerNavItems.map(toWorkspaceNavigationItem),
  },
];

const freelancerSidebarProps: Omit<AppSidebarProps, "variant" | "collapsed" | "onToggle"> = {
  showPlatformAdminNav: false,
  showWorkspaceTypeBadge: false,
  workspaceSwitcherMode: freelancerSwitcherMode,
};

export const FreelancerShell = () => {
  return (
    <AppShell
      navigationGroups={freelancerNavigationGroups}
      sidebarProps={freelancerSidebarProps}
      includeWorkspaceQuickActions={false}
    />
  );
};
