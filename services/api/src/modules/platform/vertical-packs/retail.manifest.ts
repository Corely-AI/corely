import type { AppManifest } from "@corely/contracts";

export const retailPosAppManifest: AppManifest = {
  appId: "retail",
  name: "Retail POS Pack",
  tier: 1,
  version: "1.0.0",
  description: "Quick sale, barcode, and register flows for retail checkout",
  dependencies: [],
  allowedSurfaces: ["pos"],
  allowedVerticals: ["retail"],
  capabilities: [],
  permissions: [],
  menu: [
    {
      id: "retail-quick-sale",
      scope: "web",
      section: "pos",
      labelKey: "nav.retail.quickSale",
      defaultLabel: "Quick Sale",
      route: "/pos/retail/quick-sale",
      icon: "ShoppingCart",
      order: 10,
    },
    {
      id: "retail-catalog",
      scope: "web",
      section: "pos",
      labelKey: "nav.retail.catalog",
      defaultLabel: "Catalog Lookup",
      route: "/pos/retail/catalog",
      icon: "ScanBarcode",
      order: 11,
    },
  ],
};
