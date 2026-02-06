import type { AppManifest } from "@corely/contracts";

export const partyAppManifest: AppManifest = {
  appId: "parties",
  name: "Clients & Customers",
  tier: 1,
  version: "1.0.0",
  description: "Customer and client management",
  dependencies: [],
  capabilities: [],
  permissions: ["parties.read", "parties.write"],
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
    },
    {
      id: "students",
      scope: "web",
      section: "education",
      labelKey: "nav.students",
      defaultLabel: "Students",
      route: "/students",
      icon: "User",
      order: 35,
      requiresPermissions: ["party.customers.read"],
    },
  ],
};
