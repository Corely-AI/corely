import type { AppManifest } from "@corely/contracts";

export const purchasingAppManifest: AppManifest = {
  appId: "purchasing",
  name: "Purchasing",
  tier: 3,
  version: "1.0.0",
  description: "Purchasing and supplier management",
  dependencies: [],
  capabilities: ["purchasing.purchaseOrders"],
  permissions: ["purchasing.read", "purchasing.write"],
  menu: [
    {
      id: "purchase-orders",
      scope: "web",
      section: "purchase-orders",
      labelKey: "nav.purchaseOrders",
      defaultLabel: "Purchase Orders",
      route: "/purchasing/purchase-orders",
      icon: "ShoppingBag",
      order: 21,
    },
    {
      id: "purchasing-settings",
      scope: "web",
      section: "purchasing",
      labelKey: "nav.purchasingSettings",
      defaultLabel: "Purchasing Settings",
      route: "/purchasing/settings",
      icon: "SlidersHorizontal",
      order: 100,
    },
  ],
};
