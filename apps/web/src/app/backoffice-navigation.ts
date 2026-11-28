import type {
  SurfaceId,
  WorkspaceNavigationGroup,
  WorkspaceNavigationItem,
} from "@corely/contracts";
import { matchPath } from "react-router-dom";
import {
  settingsOverviewPath,
  workspaceSettingsPath,
} from "../modules/settings/settings-navigation";
import { isLegacyInvoiceEntry } from "./router/legacy-invoice-observation";

// Group IDs are the app IDs emitted by the workspace menu API.
const appRoutes = {
  "ai-copilot": ["/assistant/*", "/copilot"],
  booking: ["/booking/*", "/openbuk/app/*"],
  catalog: ["/catalog/*"],
  "cash-management": ["/cash/*", "/cash-registers/*"],
  classes: [
    "/dashboard/teacher",
    "/billing",
    "/classes/*",
    "/class-groups/*",
    "/programs/*",
    "/sessions/*",
    "/students/*",
  ],
  cms: ["/cms/posts/*", "/cms/comments"],
  "coaching-engagements": ["/coaching/*"],
  crm: ["/crm/*", "/settings/engagement/templates"],
  expenses: ["/expenses/*"],
  forms: ["/forms/*"],
  import: ["/import/*"],
  invoices: ["/audit"],
  issues: ["/issues/*"],
  knowledge: ["/knowledge/*"],
  parties: ["/customers/*", "/suppliers/*"],
  people: ["/people/*"],
  portfolio: ["/portfolio/*"],
  purchasing: ["/purchasing/*"],
  rentals: ["/rentals/*"],
  requests: ["/requests/*"],
  sales: ["/sales/quotes/*", "/sales/orders/*", "/sales/settings", "/sales/copilot"],
  sign: ["/sign/*"],
  tasks: ["/tasks/*"],
  tax: ["/tax/*", "/taxes", "/settings/tax", "/income-statement/*"],
  website: ["/website/*"],
} as const;

const generalRoutes = [
  "/dashboard",
  "/apps",
  settingsOverviewPath,
  `${workspaceSettingsPath}/*`,
  "/settings/payment-methods/*",
  "/settings/members/*",
  "/settings/roles/*",
  "/settings/classes",
  "/settings/custom-attributes/*",
  "/settings/platform/*",
  "/freelancer/settings",
  "/notifications",
  "/cash/billing",
] as const;

const generalGroupIds = new Set(["core", "workspaces", "platform", "billing"]);

const settingsOverview: WorkspaceNavigationItem = {
  id: "profile-settings",
  section: "profile",
  label: "Settings",
  labelKey: "nav.settings",
  route: settingsOverviewPath,
  icon: "Settings",
  order: 95,
  exact: true,
};

function isSettingsEntry(item: WorkspaceNavigationItem) {
  return item.route === settingsOverviewPath || item.route === workspaceSettingsPath;
}

function resolveAppId(pathname: string) {
  if (isLegacyInvoiceEntry(pathname)) {
    return "invoices";
  }

  return Object.entries(appRoutes).find(([, routes]) =>
    routes.some((route) => matchPath(route, pathname))
  )?.[0];
}

export function resolveBackofficeNavigation(
  pathname: string,
  groups: WorkspaceNavigationGroup[],
  surfaceId: SurfaceId = "platform"
) {
  // The dedicated CRM and POS hosts keep their existing surface navigation.
  if (
    (surfaceId === "crm" && !matchPath("/crm/*", pathname)) ||
    (surfaceId === "pos" && !matchPath("/cash/billing", pathname))
  ) {
    return { groups, scope: "workspace" as const };
  }

  // Subscription billing uses the general sidebar even though its URL is under Cash.
  if (generalRoutes.some((route) => matchPath(route, pathname))) {
    const generalItems = groups.flatMap((group) =>
      generalGroupIds.has(group.id)
        ? group.items
        : group.items.filter((item) => group.id === "cash-management" && item.id === "cash-billing")
    );
    const existingSettings = generalItems.find((item) => item.route === settingsOverviewPath);
    // Workspace is shown as a child of the Settings overview in the Backoffice sidebar.
    const items =
      surfaceId === "platform"
        ? generalItems.filter((item) => !isSettingsEntry(item))
        : generalItems;
    if (surfaceId === "platform" || !existingSettings) {
      items.push({ ...existingSettings, ...settingsOverview });
    }

    return {
      groups: [{ id: "core", labelKey: "nav.groups.core", defaultLabel: "Core", order: 1, items }],
      scope: "general" as const,
    };
  }

  const appId = resolveAppId(pathname);
  if (appId) {
    return { groups: groups.filter((group) => group.id === appId), scope: "app" as const };
  }

  const settingsGroup =
    groups.find((group) => group.items.some((item) => item.route === settingsOverviewPath)) ??
    groups.find((group) => group.items.some(isSettingsEntry));
  if (surfaceId === "platform" && settingsGroup) {
    return {
      groups: groups.map((group) => {
        const items = group.items.filter((item) => !isSettingsEntry(item));
        if (group === settingsGroup) {
          const existingSettings = group.items.find((item) => item.route === settingsOverviewPath);
          items.push({ ...existingSettings, ...settingsOverview });
        }
        return { ...group, items };
      }),
      scope: "workspace" as const,
    };
  }

  return { groups, scope: "workspace" as const };
}
