import type { AppManifest } from "@corely/contracts";

export const knowledgeAppManifest: AppManifest = {
  appId: "knowledge",
  name: "Knowledge",
  tier: 1,
  version: "1.0.0",
  dependencies: [],
  allowedSurfaces: ["platform"],
  description: "Private workspace procedures with accountable publication",
  directory: {
    menuId: "knowledge-procedures",
    logo: { iconKey: "BookOpen", tone: "accent" },
    displayName: { en: "Knowledge", de: "Wissen", vi: "Kiến thức" },
    category: "operations",
  },
  capabilities: ["knowledge.procedures"],
  permissions: ["knowledge.read", "knowledge.manage"],
  entitlement: { enabledFeatureKey: "app.knowledge.enabled", defaultEnabled: true },
  menu: [
    {
      id: "knowledge-procedures",
      scope: "web",
      section: "team",
      labelKey: "nav.knowledge",
      defaultLabel: "Knowledge",
      route: "/knowledge",
      icon: "BookOpen",
      order: 3,
      requiresPermissions: ["knowledge.read"],
      requiresCapabilities: ["knowledge.procedures"],
    },
  ],
};
