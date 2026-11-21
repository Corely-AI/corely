import type { WorkspaceNavigationGroup, WorkspaceNavigationItem } from "@corely/contracts";
import { matchPath } from "react-router-dom";
import { isLegacyInvoiceEntry } from "./router/legacy-invoice-observation";

// Group IDs are the app IDs emitted by the workspace menu API.
const appRoutes = {
  expenses: ["/expenses/*"],
  crm: ["/crm/*", "/settings/engagement/templates"],
  tasks: ["/tasks/*"],
  people: ["/people/*"],
  booking: ["/booking/*", "/openbuk/app/*"],
} as const;

const generalRoutes = [
  "/dashboard",
  "/apps",
  "/settings",
  "/settings/workspace/*",
  "/settings/payment-methods/*",
  "/settings/members/*",
  "/settings/roles/*",
  "/settings/classes",
  "/settings/custom-attributes/*",
  "/cash/billing",
] as const;

const generalGroupIds = new Set(["core", "workspaces", "platform", "billing"]);

const accountSettings: WorkspaceNavigationItem = {
  id: "profile-settings",
  section: "profile",
  label: "Settings",
  labelKey: "nav.settings",
  route: "/settings",
  icon: "Settings",
  order: 95,
  exact: true,
};

function resolveAppId(pathname: string, search: string) {
  if (
    isLegacyInvoiceEntry(pathname) ||
    (matchPath("/audit", pathname) && new URLSearchParams(search).get("entity") === "invoice")
  ) {
    return "invoices";
  }

  return Object.entries(appRoutes).find(([, routes]) =>
    routes.some((route) => matchPath(route, pathname))
  )?.[0];
}

export function resolveBackofficeNavigation(
  pathname: string,
  search: string,
  groups: WorkspaceNavigationGroup[]
) {
  const appId = resolveAppId(pathname, search);
  if (appId) {
    return { groups: groups.filter((group) => group.id === appId), scope: "app" as const };
  }

  if (generalRoutes.some((route) => matchPath(route, pathname))) {
    const items = groups.flatMap((group) =>
      generalGroupIds.has(group.id)
        ? group.items
        : group.items.filter((item) => group.id === "cash-management" && item.id === "cash-billing")
    );

    // Account settings is available to any authenticated user of this shell.
    if (!items.some((item) => item.route === "/settings")) {
      items.push(accountSettings);
    }

    return {
      groups: [{ id: "core", labelKey: "nav.groups.core", defaultLabel: "Core", order: 1, items }],
      scope: "general" as const,
    };
  }

  return { groups, scope: "workspace" as const };
}
