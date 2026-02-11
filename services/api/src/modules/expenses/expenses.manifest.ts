import type { AppManifest } from "@corely/contracts";

export const expensesAppManifest: AppManifest = {
  appId: "expenses",
  name: "Expenses",
  tier: 1,
  version: "1.0.0",
  description: "Expense tracking",
  dependencies: [],
  capabilities: [],
  permissions: ["expenses.read", "expenses.write"],
  entitlement: {
    enabledFeatureKey: "app.expenses.enabled",
    defaultEnabled: true,
  },
  menu: [
    {
      id: "expenses",
      scope: "web",
      section: "expenses",
      labelKey: "nav.expenses",
      defaultLabel: "Expenses",
      route: "/expenses",
      icon: "Receipt",
      order: 20,
    },
  ],
};
