import type { AppManifest } from "@corely/contracts";

export const coreAppManifest: AppManifest = {
  appId: "core",
  name: "Core",
  tier: 0,
  version: "1.0.0",
  description: "Dashboard and core features",
  dependencies: [],
  capabilities: [],
  permissions: [],
  menu: [
    {
      id: "dashboard",
      scope: "web",
      section: "dashboard",
      labelKey: "nav.dashboard",
      defaultLabel: "Dashboard",
      route: "/dashboard",
      icon: "LayoutDashboard",
      order: 1,
    },
  ],
};
