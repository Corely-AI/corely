import type { AppManifest } from "@corely/contracts";

export const portfolioAppManifest: AppManifest = {
  appId: "portfolio",
  directory: {
    menuId: "portfolio-showcases",
    logo: { iconKey: "Briefcase", tone: "muted" },
    displayName: { en: "Portfolio", de: "Portfolio", vi: "Hồ sơ năng lực" },
    category: "content",
  },
  name: "Portfolio",
  tier: 2,
  version: "1.0.0",
  description: "Public portfolio showcases, projects, and clients",
  dependencies: [],
  allowedSurfaces: ["platform"],
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
