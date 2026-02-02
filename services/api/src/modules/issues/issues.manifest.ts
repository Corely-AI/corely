import type { AppManifest } from "@corely/contracts";

export const issuesAppManifest: AppManifest = {
  appId: "issues",
  name: "Issues",
  tier: 1,
  version: "1.0.0",
  description: "Issue tracking and management",
  dependencies: [],
  capabilities: ["issues.manage", "issues.voice"],
  permissions: ["issues.read", "issues.write", "issues.delete", "issues.resolve", "issues.assign"],
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
      requiresPermissions: ["issues.read"],
    },
  ],
};
