import type { AppManifest } from "@corely/contracts";

export const issuesAppManifest: AppManifest = {
  appId: "issues",
  name: "Issues",
  tier: 1,
  version: "1.0.0",
  description: "Issue tracking and management",
  dependencies: [],
  capabilities: [],
  permissions: [],
  menu: [
    {
      id: "issues",
      scope: "web",
      section: "issues",
      labelKey: "nav.issues",
      defaultLabel: "Issues",
      route: "/issues",
      icon: "Bug",
      order: 30,
    },
  ],
};
