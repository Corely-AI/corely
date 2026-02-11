import type { AppManifest } from "@corely/contracts";

export const platformAppManifest: AppManifest = {
  appId: "platform",
  name: "Platform",
  tier: 0,
  version: "1.0.0",
  description: "Core platform features",
  dependencies: [],
  capabilities: ["platform.manage"],
  permissions: ["platform.apps.manage"],
  entitlement: {
    enabledFeatureKey: "app.platform.enabled",
    defaultEnabled: true,
  },
  menu: [
    {
      id: "platform-settings",
      scope: "web",
      section: "platform",
      labelKey: "nav.platform",
      defaultLabel: "Platform",
      route: "/settings/platform",
      icon: "Cpu",
      order: 100,
      requiresPermissions: ["platform.apps.manage"],
    },
  ],
};
