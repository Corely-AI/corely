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
  menu: [
    {
      id: "catalog-items",
      scope: "web",
      section: "inventory",
      labelKey: "nav.catalog.items",
      defaultLabel: "Catalog",
      route: "/catalog/items",
      icon: "Package",
      order: 5,
    },
  ],
};
