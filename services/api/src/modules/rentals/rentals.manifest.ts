import type { AppManifest } from "@corely/contracts";

export const rentalsAppManifest: AppManifest = {
  appId: "rentals",
  name: "Vacation Rentals",
  tier: 2,
  version: "1.0.0",
  description: "Manage vacation home rentals and availability",
  dependencies: [],
  capabilities: ["rentals.manage"],
  permissions: ["rentals.read", "rentals.write"],
  menu: [
    {
      id: "rental-properties",
      scope: "web",
      section: "rentals",
      labelKey: "nav.rentals.properties",
      defaultLabel: "Vacation Rentals",
      route: "/rentals/properties",
      icon: "Home",
      order: 25,
    },
  ],
};
