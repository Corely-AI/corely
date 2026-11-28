import type { AppManifest } from "@corely/contracts";

export const issuesAppManifest: AppManifest = {
  appId: "issues",
  directory: {
    menuId: "issues",
    logo: { iconKey: "ShieldAlert", tone: "accent" },
    displayName: { en: "Requests", de: "Anfragen", vi: "Yêu cầu" },
    category: "operations",
  },
  name: "Requests",
  tier: 1,
  version: "1.0.0",
  description: "Receive, resolve and follow up on service requests",
  dependencies: [],
  allowedSurfaces: ["platform"],
  capabilities: ["issues.manage", "issues.voice"],
  permissions: ["issues.read", "issues.write", "issues.delete", "issues.resolve", "issues.assign"],
  menu: [
    {
      id: "issues",
      scope: "web",
      section: "issues",
      labelKey: "nav.issues",
      defaultLabel: "Requests",
      route: "/issues",
      icon: "Bug",
      order: 30,
      requiresPermissions: ["issues.read"],
    },
  ],
};
