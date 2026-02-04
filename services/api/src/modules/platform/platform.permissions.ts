/**
 * Platform Module Permissions
 * Permissions for managing tenant apps, templates, packs, and menu
 */

export type PermissionSide = "HOST" | "TENANT" | "BOTH";

export interface PermissionDefinition {
  key: string;
  group: string;
  label: string;
  description?: string;
  danger?: boolean;
  side?: PermissionSide; // Default to TENANT if undefined
}

export interface PermissionGroup {
  id: string;
  label: string;
  permissions: PermissionDefinition[];
}

export const platformPermissions: PermissionGroup[] = [
  {
    id: "platform",
    label: "Platform Management",
    permissions: [
      {
        key: "platform.apps.manage",
        group: "platform",
        label: "Manage Apps",
        description: "Enable and disable apps for the tenant",
        danger: true,
        side: "HOST",
      },
      {
        key: "platform.templates.apply",
        group: "platform",
        label: "Apply Templates",
        description: "Apply configuration templates to the tenant",
        danger: false,
        side: "HOST",
      },
      {
        key: "platform.packs.install",
        group: "platform",
        label: "Install Packs",
        description: "Install app bundles and configuration packs",
        danger: true,
        side: "HOST",
      },
      {
        key: "platform.menu.customize",
        group: "platform",
        label: "Customize Menu",
        description: "Customize tenant menu layout and visibility",
        danger: false,
        side: "TENANT", // Menu customization is usually tenant-admin level
      },
      {
        key: "platform.tenants.read",
        group: "platform",
        label: "View Tenants",
        description: "View tenants and related configuration",
        danger: false,
        side: "HOST",
      },
      {
        key: "platform.tenants.write",
        group: "platform",
        label: "Manage Tenants",
        description: "Create and manage tenants",
        danger: true,
        side: "HOST",
      },
      {
        key: "platform.tenants.entitlements.write",
        group: "platform",
        label: "Manage Tenant Entitlements",
        description: "Enable or disable apps and entitlements for tenants",
        danger: true,
        side: "HOST",
      },
      {
        key: "platform.tenants.features.write",
        group: "platform",
        label: "Manage Tenant Features",
        description: "Update tenant feature flags",
        danger: true,
        side: "HOST",
      },
      {
        key: "platform.roles.read",
        group: "platform",
        label: "View Platform Roles",
        description: "View platform roles and permissions",
        danger: false,
        side: "HOST",
      },
      {
        key: "platform.roles.write",
        group: "platform",
        label: "Manage Platform Roles",
        description: "Create and update platform roles and permissions",
        danger: true,
        side: "HOST",
      },
      {
        key: "platform.settings.read",
        group: "platform",
        label: "View Platform Settings",
        description: "View global platform settings",
        danger: false,
        side: "HOST",
      },
      {
        key: "platform.settings.write",
        group: "platform",
        label: "Manage Platform Settings",
        description: "Manage global platform settings",
        danger: true,
        side: "HOST",
      },
    ],
  },
];
