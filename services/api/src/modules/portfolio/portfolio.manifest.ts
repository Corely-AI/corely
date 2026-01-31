import type { AppManifest } from "@corely/contracts";

export const portfolioAppManifest: AppManifest = {
  appId: "portfolio",
  name: "Portfolio",
  tier: 2,
  version: "1.0.0",
  description: "Public portfolio showcases, projects, and clients",
  dependencies: [],
  capabilities: [],
  permissions: ["portfolio.read", "portfolio.write", "portfolio.publish"],
  menu: [
    {
      id: "portfolio-showcases",
      scope: "web",
      section: "portfolio",
      labelKey: "nav.portfolio",
      defaultLabel: "Portfolio",
      route: "/portfolio/showcases",
      icon: "Briefcase",
      order: 45,
      requiresPermissions: ["portfolio.read"],
    },
  ],
};
