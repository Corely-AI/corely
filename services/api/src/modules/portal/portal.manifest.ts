import type { AppManifest } from "@corely/contracts";

export const portalAppManifest: AppManifest = {
  appId: "portal",
  name: "Portal",
  tier: 1,
  version: "1.0.0",
  description: "Student and Guardian Portal",
  dependencies: ["classes", "documents", "party"],
  capabilities: [],
  permissions: ["portal.read"],
  menu: [], // Portal has its own UI, no staff menu
};
