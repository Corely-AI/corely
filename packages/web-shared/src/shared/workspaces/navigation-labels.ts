import type { WorkspaceNavigationGroup, WorkspaceNavigationItem } from "@corely/contracts";

const NAV_GROUP_KEY_BY_ID: Record<string, string> = {
  core: "nav.groups.core",
  freelancer: "nav.groups.freelancer",
  sales: "nav.groups.sales",
  purchasing: "nav.groups.purchasing",
  inventory: "nav.groups.inventory",
  finance: "nav.groups.finance",
  booking: "nav.groups.booking",
  settings: "nav.groups.settings",
  platform: "nav.groups.platform",
  tax: "nav.groups.tax",
  education: "nav.groups.education",
  other: "nav.groups.other",
};

const NAV_ITEM_KEY_BY_ID: Record<string, string> = {
  dashboard: "nav.dashboard",
  "crm-dashboard": "nav.crmDashboard",
  "crm-deals": "nav.crmDeals",
  "crm-leads": "nav.crmLeads",
  "crm-activities": "nav.crmActivities",
  "crm-sequences": "nav.crmSequences",
  "crm-email-settings": "nav.crmEmailSettings",
  "crm-templates-settings": "nav.crmTemplates",
  assistant: "nav.assistant",
  "ai-copilot": "nav.assistant",
  "crm-assistant": "nav.assistant",
  expenses: "nav.expenses",
  invoices: "nav.invoices",
  clients: "nav.clients",
  portfolio: "nav.portfolio",
  "website-sites": "nav.website",
  "tax-overview": "nav.tax.overview",
  tax: "nav.tax.overview",
  "tax-filings": "nav.tax.filings",
  "tax-reports": "nav.tax.reports",
  "tax-payments": "nav.tax.payments",
  "tax-documents": "nav.tax.documents",
  "tax-settings": "nav.tax.settings",
  "cash-management": "nav.cashManagement",
  "purchase-orders": "nav.purchaseOrders",
  "purchasing-settings": "nav.purchasingSettings",
  "workspace-settings": "nav.workspace",
  "workspace-profile": "nav.profile",
  "workspace-members": "nav.members",
  "workspace-roles": "nav.roles",
  "payment-methods": "nav.paymentMethods",
  classes: "nav.classes",
  students: "nav.students",
  programs: "nav.programs",
  "class-sessions": "nav.classSessions",
  "class-billing": "nav.classBilling",
  forms: "nav.forms",
  issues: "nav.issues",
  "catalog-items": "nav.catalogItems",
  "import-shipments": "nav.importShipments",
  "directory-restaurants": "nav.directory.restaurants",
  tenants: "nav.tenants",
};

const NAV_ITEM_KEY_BY_ROUTE_PREFIX: Array<[prefix: string, key: string]> = [
  ["/dashboard", "nav.dashboard"],
  ["/assistant", "nav.assistant"],
  ["/expenses", "nav.expenses"],
  ["/invoices", "nav.invoices"],
  ["/crm/deals", "nav.crmDeals"],
  ["/crm/leads", "nav.crmLeads"],
  ["/crm/activities", "nav.crmActivities"],
  ["/crm/sequences", "nav.crmSequences"],
  ["/crm/settings/email", "nav.crmEmailSettings"],
  ["/crm", "nav.crmDashboard"],
  ["/portfolio", "nav.portfolio"],
  ["/website", "nav.website"],
  ["/tax/overview", "nav.tax.overview"],
  ["/tax/reports", "nav.tax.reports"],
  ["/tax/filings", "nav.tax.filings"],
  ["/tax/payments", "nav.tax.payments"],
  ["/tax/documents", "nav.tax.documents"],
  ["/tax/settings", "nav.tax.settings"],
  ["/cash-management", "nav.cashManagement"],
  ["/purchase-orders", "nav.purchaseOrders"],
  ["/settings/purchasing", "nav.purchasingSettings"],
  ["/settings/workspace", "nav.workspace"],
  ["/settings/profile", "nav.profile"],
  ["/settings/members", "nav.members"],
  ["/settings/roles", "nav.roles"],
  ["/settings/payment-methods", "nav.paymentMethods"],
  ["/classes/sessions", "nav.classSessions"],
  ["/classes/billing", "nav.classBilling"],
  ["/classes", "nav.classes"],
  ["/students", "nav.students"],
  ["/programs", "nav.programs"],
  ["/forms", "nav.forms"],
  ["/issues", "nav.issues"],
  ["/catalog/items", "nav.catalogItems"],
  ["/import/shipments", "nav.importShipments"],
  ["/directory/restaurants", "nav.directory.restaurants"],
  ["/settings/tenants", "nav.tenants"],
];

const NAV_ITEM_KEY_BY_ENGLISH_LABEL: Record<string, string> = {
  dashboard: "nav.dashboard",
  assistant: "nav.assistant",
  expenses: "nav.expenses",
  invoices: "nav.invoices",
  clients: "nav.clients",
  portfolio: "nav.portfolio",
  website: "nav.website",
  deals: "nav.crmDeals",
  leads: "nav.crmLeads",
  activities: "nav.crmActivities",
  sequences: "nav.crmSequences",
  "email settings": "nav.crmEmailSettings",
  forms: "nav.forms",
  issues: "nav.issues",
  tenants: "nav.tenants",
};

const NAV_GROUP_KEY_BY_ENGLISH_LABEL: Record<string, string> = {
  core: "nav.groups.core",
  freelancer: "nav.groups.freelancer",
  sales: "nav.groups.sales",
  purchasing: "nav.groups.purchasing",
  inventory: "nav.groups.inventory",
  finance: "nav.groups.finance",
  booking: "nav.groups.booking",
  settings: "nav.groups.settings",
  platform: "nav.groups.platform",
  tax: "nav.groups.tax",
  education: "nav.groups.education",
  other: "nav.groups.other",
};

const normalizeLabel = (label: string): string => label.trim().toLowerCase().replace(/\s+/g, " ");

const looksLikeI18nKey = (value: string | undefined): value is string =>
  typeof value === "string" && value.includes(".");

export const resolveNavigationItemLabelKey = (
  item: Pick<WorkspaceNavigationItem, "id" | "labelKey" | "label" | "route">
): string | undefined => {
  if (looksLikeI18nKey(item.labelKey)) {
    return item.labelKey;
  }

  const fromId = NAV_ITEM_KEY_BY_ID[item.id];
  if (fromId) {
    return fromId;
  }

  if (item.route) {
    const fromRoute = NAV_ITEM_KEY_BY_ROUTE_PREFIX.find(([prefix]) =>
      item.route.startsWith(prefix)
    );
    if (fromRoute) {
      return fromRoute[1];
    }
  }

  if (looksLikeI18nKey(item.label)) {
    return item.label;
  }

  return NAV_ITEM_KEY_BY_ENGLISH_LABEL[normalizeLabel(item.label)];
};

export const resolveNavigationGroupLabelKey = (
  group: Pick<WorkspaceNavigationGroup, "id" | "labelKey" | "defaultLabel">
): string | undefined => {
  if (looksLikeI18nKey(group.labelKey)) {
    return group.labelKey;
  }

  const fromId = NAV_GROUP_KEY_BY_ID[group.id];
  if (fromId) {
    return fromId;
  }

  if (looksLikeI18nKey(group.defaultLabel)) {
    return group.defaultLabel;
  }

  return NAV_GROUP_KEY_BY_ENGLISH_LABEL[normalizeLabel(group.defaultLabel)];
};
