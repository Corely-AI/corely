import type { AppManifest } from "@corely/contracts";
export const tasksAppManifest: AppManifest = {
  appId: "tasks",
  name: "Tasks",
  tier: 1,
  version: "1.0.0",
  dependencies: ["people"],
  allowedSurfaces: ["platform"],
  description: "Employee daily work with accountable ownership",
  capabilities: ["tasks.basic"],
  permissions: ["tasks.read", "tasks.manage", "tasks.own.update"],
  entitlement: { enabledFeatureKey: "app.tasks.enabled", defaultEnabled: true },
  operationalExperiences: [
    { experienceId: "daily-work", route: "/app/tasks", requiredPermissions: ["tasks.read"] },
  ],
  menu: [
    {
      id: "tasks-daily-work",
      scope: "web",
      section: "team",
      labelKey: "nav.tasks",
      defaultLabel: "Daily Work",
      route: "/tasks",
      icon: "ClipboardList",
      order: 2,
      requiresPermissions: ["tasks.read"],
      requiresCapabilities: ["tasks.basic"],
    },
  ],
};
