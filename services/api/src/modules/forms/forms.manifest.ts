import type { AppManifest } from "@corely/contracts";

export const formsAppManifest: AppManifest = {
  appId: "forms",
  directory: {
    menuId: "forms",
    logo: { iconKey: "FileSignature", tone: "muted" },
    displayName: { en: "Forms", de: "Formulare", vi: "Biểu mẫu" },
    category: "content",
  },
  name: "Forms",
  tier: 2,
  version: "1.0.0",
  description: "Create, publish, and manage public forms and submissions",
  dependencies: [],
  allowedSurfaces: ["platform"],
  capabilities: [],
  permissions: ["forms.read", "forms.manage", "forms.submissions.read"],
  entitlement: {
    defaultEnabled: true,
  },
  menu: [
    {
      id: "forms",
      scope: "web",
      section: "forms",
      labelKey: "nav.forms",
      defaultLabel: "Forms",
      route: "/forms",
      icon: "FileSignature",
      order: 30,
      requiresPermissions: ["forms.read"],
    },
  ],
};
