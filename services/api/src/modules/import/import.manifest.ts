import type { AppManifest } from "@corely/contracts";

export const importAppManifest: AppManifest = {
  appId: "import",
  name: "Import",
  tier: 3,
  version: "1.0.0",
  description: "Import shipment tracking and customs operations",
  dependencies: [],
  capabilities: ["import.basic"],
  permissions: ["import.shipments.read", "import.shipments.manage"],
  entitlement: {
    defaultEnabled: true,
  },
  menu: [
    {
      id: "import-shipments",
      scope: "web",
      section: "import",
      labelKey: "nav.importShipments",
      defaultLabel: "Shipments",
      route: "/import/shipments",
      icon: "Package",
      order: 10,
      requiresCapabilities: ["import.basic"],
      requiresPermissions: ["import.shipments.read"],
    },
  ],
};
