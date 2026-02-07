import type { PermissionGroup } from "@corely/contracts";

export const classesPermissions: PermissionGroup[] = [
  {
    id: "classes",
    label: "Classes",
    permissions: [
      {
        key: "classes.read",
        group: "classes",
        label: "Read classes",
        description: "View class groups, sessions, and attendance.",
      },
      {
        key: "classes.write",
        group: "classes",
        label: "Manage classes",
        description: "Create and update class groups, sessions, and enrollments.",
      },
      {
        key: "classes.billing",
        group: "classes",
        label: "Manage class billing",
        description: "Create billing runs and invoices for classes.",
      },
    ],
  },
];
