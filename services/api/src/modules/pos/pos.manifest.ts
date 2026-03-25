import type { AppManifest } from "@corely/contracts";

export const posAdminAppManifest: AppManifest = {
  appId: "pos-admin",
  name: "POS Admin",
  tier: 1,
  version: "1.0.0",
  description: "Manage POS selling stations without crossing into cash-drawer operations",
  dependencies: [],
  allowedSurfaces: ["pos"],
  entitlement: {
    defaultEnabled: true,
  },
  capabilities: [],
  permissions: ["pos.registers.read", "pos.registers.manage"],
  menu: [
    {
      id: "pos-admin-registers",
      scope: "web",
      section: "pos",
      labelKey: "nav.pos.registers",
      defaultLabel: "Registers",
      route: "/pos/admin/registers",
      icon: "MonitorSmartphone",
      order: 20,
      requiresPermissions: ["pos.registers.read"],
    },
  ],
};
