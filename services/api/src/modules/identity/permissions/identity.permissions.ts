import type { PermissionGroup } from "@corely/contracts";

export const identityPermissions: PermissionGroup[] = [
  {
    id: "people",
    label: "Operational staff access",
    permissions: [
      { key: "people.directory.read", group: "people", label: "Read neutral staff directory" },
      {
        key: "people.self.read",
        group: "people",
        label: "Read own staff profile and working pattern",
      },
      {
        key: "people.self.update",
        group: "people",
        label: "Update own display name and personal contacts",
      },
      {
        key: "people.profile.manage",
        group: "people",
        label: "Manage operational staff profiles",
        danger: true,
      },
      ...[
        { key: "people.private.read", label: "Read private personnel details" },
        { key: "people.private.manage", label: "Change private personnel details" },
        { key: "people.documents.read", label: "Read personnel attachments" },
        { key: "people.export", label: "Export permitted personnel data" },
        { key: "people.audit.read", label: "Read personnel audit history" },
      ].map((permission) => ({ ...permission, group: "people", danger: true })),
    ],
  },
  {
    id: "documents",
    label: "Restricted document access",
    permissions: [
      {
        key: "documents.read",
        group: "documents",
        label: "Read tenant documents and signed files",
        danger: true,
      },
      {
        key: "documents.manage",
        group: "documents",
        label: "Create and change tenant documents",
        danger: true,
      },
    ],
  },
  {
    id: "settings",
    label: "Settings",
    permissions: [
      {
        key: "settings.roles.manage",
        group: "settings",
        label: "Manage roles and permissions",
        description: "Create, update, delete roles and grant permissions.",
        danger: true,
      },
      {
        key: "settings.roles.read",
        group: "settings",
        label: "View roles and permissions",
        description: "View roles and permission assignments.",
      },
    ],
  },
];
