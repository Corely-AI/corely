import type { PermissionGroup } from "@corely/contracts";

export const portfolioPermissions: PermissionGroup[] = [
  {
    id: "portfolio",
    label: "Portfolio",
    permissions: [
      {
        key: "portfolio.read",
        group: "portfolio",
        label: "Read portfolio",
        description: "View portfolio showcases, projects, and clients.",
      },
      {
        key: "portfolio.write",
        group: "portfolio",
        label: "Manage portfolio",
        description: "Create and update portfolio content.",
      },
      {
        key: "portfolio.publish",
        group: "portfolio",
        label: "Publish portfolio",
        description: "Publish portfolio showcases and content.",
      },
    ],
  },
];
