import type { AppManifest } from "@corely/contracts";

export const partyAppManifest: AppManifest = {
  appId: "parties",
  name: "Clients & Customers",
  tier: 1,
  version: "1.0.0",
  description: "Customer and client management",
  dependencies: [],
  capabilities: [],
  permissions: ["party.customers.read", "party.customers.manage"],
  entitlement: {
    defaultEnabled: true,
  },
  menu: [
    {
      id: "clients",
      scope: "web",
      section: "clients",
      labelKey: "nav.clients",
      defaultLabel: "Clients",
      route: "/customers",
      icon: "UsersRound",
      order: 30,
      requiresPermissions: ["party.customers.read"],
    },
    {
      id: "suppliers",
      scope: "web",
      section: "suppliers",
      labelKey: "nav.suppliers",
      defaultLabel: "Suppliers",
      route: "/suppliers",
      icon: "Building2",
      order: 31,
      requiresPermissions: ["party.customers.read"],
    },
  ],
};
