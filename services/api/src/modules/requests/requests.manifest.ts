import type { AppManifest } from "@corely/contracts";

export const requestsAppManifest: AppManifest = {
  appId: "requests",
  name: "Requests",
  tier: 1,
  version: "1.0.0",
  description: "Private employee requests with structured submissions",
  dependencies: ["people"],
  allowedSurfaces: ["platform"],
  capabilities: ["requests.basic"],
  permissions: [
    "requests.read",
    "requests.own.submit",
    "requests.review",
    "requests.routing.manage",
  ],
  entitlement: { enabledFeatureKey: "app.requests.enabled", defaultEnabled: true },
  directory: {
    menuId: "requests",
    logo: { iconKey: "ClipboardList", tone: "accent" },
    displayName: { en: "Requests", de: "Anträge", vi: "Yêu cầu" },
    category: "operations",
  },
  menu: [
    {
      id: "requests",
      scope: "web",
      section: "team",
      labelKey: "nav.requests",
      defaultLabel: "Requests",
      route: "/requests",
      icon: "ClipboardList",
      order: 4,
      requiresPermissions: ["requests.read"],
      requiresCapabilities: ["requests.basic"],
    },
  ],
};
