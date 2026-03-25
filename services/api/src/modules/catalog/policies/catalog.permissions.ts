import type { PermissionGroup } from "@corely/contracts";

export const catalogPermissions: PermissionGroup[] = [
  {
    id: "catalog",
    label: "Catalog",
    permissions: [
      {
        key: "catalog.read",
        group: "catalog",
        label: "View catalog",
      },
      {
        key: "catalog.quickwrite",
        group: "catalog",
        label: "Quick add POS catalog items",
      },
      {
        key: "catalog.write",
        group: "catalog",
        label: "Manage catalog",
      },
    ],
  },
];
