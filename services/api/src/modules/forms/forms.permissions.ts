import type { PermissionGroup } from "@corely/contracts";

export const formsPermissions: PermissionGroup[] = [
  {
    id: "forms",
    label: "Forms",
    permissions: [
      {
        key: "forms.read",
        group: "forms",
        label: "View forms",
        description: "List and view form definitions.",
      },
      {
        key: "forms.manage",
        group: "forms",
        label: "Manage forms",
        description: "Create, update, publish, and delete forms.",
      },
      {
        key: "forms.submissions.read",
        group: "forms",
        label: "View submissions",
        description: "View form submissions and summaries.",
      },
    ],
  },
];
