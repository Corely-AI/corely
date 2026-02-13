import type { AppManifest } from "@corely/contracts";

export const catalogAppManifest: AppManifest = {
  appId: "catalog",
  name: "Catalog",
  tier: 2,
  version: "1.0.0",
  description: "Manage products, variants, units, and tax profiles",
  dependencies: [],
  capabilities: ["catalog.basic"],
  permissions: ["catalog.read", "catalog.write"],
  entitlement: {
    defaultEnabled: true,
  },
  menu: [
    {
      id: "catalog-items",
      scope: "web",
      section: "inventory",
      labelKey: "nav.catalogItems",
      defaultLabel: "Catalog Items",
      route: "/catalog/items",
      icon: "Package",
      order: 5,
      requiresCapabilities: ["catalog.basic"],
      requiresPermissions: ["catalog.read"],
    },
  ],
};
