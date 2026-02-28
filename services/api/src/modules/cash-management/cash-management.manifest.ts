import type { AppManifest } from "@corely/contracts";

export const cashManagementAppManifest: AppManifest = {
  appId: "cash-management",
  name: "Cash Management",
  tier: 1,
  version: "1.0.0",
  description: "Cash registers and daily close",
  dependencies: [],
  capabilities: [],
  permissions: ["cash.read", "cash.write"],
  menu: [
    {
      id: "cash-management",
      scope: "web",
      section: "cash",
      labelKey: "nav.cashManagement",
      defaultLabel: "Cash Management",
      route: "/cash/registers",
      icon: "Coins",
      order: 60,
    },
  ],
};
