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
      {
        key: "classes.cohort.manage",
        group: "classes",
        label: "Manage cohorts",
        description: "Create, publish and update cohorts.",
      },
      {
        key: "classes.cohort.team.manage",
        group: "classes",
        label: "Manage cohort team",
        description: "Assign instructors, mentors and assistants.",
      },
      {
        key: "classes.cohort.billing.manage",
        group: "classes",
        label: "Manage cohort billing",
        description: "Configure billing plans and generate cohort invoices.",
      },
      {
        key: "classes.cohort.outcomes.manage",
        group: "classes",
        label: "Manage outcomes",
        description: "Manage milestones and completion statuses.",
      },
      {
        key: "classes.cohort.resources.manage",
        group: "classes",
        label: "Manage resources",
        description: "Manage cohort recordings, docs and links.",
      },
      {
        key: "classes.session.manage",
        group: "classes",
        label: "Manage sessions",
        description: "Create and edit class sessions.",
      },
      {
        key: "classes.enrollment.manage",
        group: "classes",
        label: "Manage enrollments",
        description: "Manage applications and cohort enrollments.",
      },
      {
        key: "classes.teacher.dashboard.view",
        group: "classes",
        label: "View teacher dashboard",
        description: "View teacher dashboard and class health metrics.",
      },
    ],
  },
];
