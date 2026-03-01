import type { Command } from "@/shared/command-palette/types";

export { default as SettingsPage } from "./screens/SettingsPage";
export { default as RolesPage } from "./screens/RolesPage";
export { default as RolePermissionsPage } from "./screens/RolePermissionsPage";
export { default as DimensionsSettingsPage } from "./screens/DimensionsSettingsPage";
export { default as CustomFieldsSettingsPage } from "./screens/CustomFieldsSettingsPage";
export { default as EngagementTemplatesSettingsPage } from "./screens/EngagementTemplatesSettingsPage";

// Workspace Profile Components
export { ContactDetailsDialog } from "./components/workspace-profile/ContactDetailsDialog";
export { TaxDetailsDialog } from "./components/workspace-profile/TaxDetailsDialog";
export { PaymentMethodSwitcher } from "./payment-methods";

export const commandContributions = (): Command[] => [
  {
    id: "module.settings.workspace",
    title: "Workspace Settings",
    subtitle: "Configure workspace profile and defaults",
    keywords: ["workspace", "settings", "preferences"],
    group: "General",
    run: ({ navigate }) => navigate("/settings/workspace"),
  },
];
