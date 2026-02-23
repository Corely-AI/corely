import type { AppManifest } from "@corely/contracts";

export const directoryAppManifest: AppManifest = {
  appId: "directory",
  name: "Directory",
  tier: 1,
  version: "1.0.0",
  description: "Manage public directory restaurants",
  dependencies: [],
  capabilities: ["directory.restaurants.manage"],
  permissions: ["directory.restaurants.manage"],
  entitlement: {
    defaultEnabled: true,
  },
  menu: [
    {
      id: "directory-restaurants",
      scope: "web",
      section: "directory",
      labelKey: "nav.directory.restaurants",
      defaultLabel: "Restaurants",
      route: "/directory/restaurants",
      icon: "Home",
      order: 20,
      requiresPermissions: ["directory.restaurants.manage"],
    },
  ],
};
