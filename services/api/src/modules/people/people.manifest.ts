import type { AppManifest } from "@corely/contracts";
export const peopleAppManifest: AppManifest = {
  appId: "people",
  name: "People",
  tier: 1,
  version: "1.0.0",
  dependencies: [],
  allowedSurfaces: ["platform"],
  description: "Workspace staff directory and explicit identity links",
  capabilities: ["people.directory"],
  permissions: [
    "people.directory.read",
    "people.profile.manage",
    "people.private.read",
    "people.private.manage",
  ],
  entitlement: { enabledFeatureKey: "app.people.enabled", defaultEnabled: true },
  menu: [
    {
      id: "people-directory",
      scope: "web",
      section: "team",
      labelKey: "nav.people",
      defaultLabel: "Staff directory",
      route: "/people/staff",
      icon: "Users",
      order: 1,
      requiresPermissions: ["people.directory.read"],
      requiresCapabilities: ["people.directory"],
    },
  ],
};
