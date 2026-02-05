import type { AppManifest } from "@corely/contracts";

export const websiteAppManifest: AppManifest = {
  appId: "website",
  name: "Website",
  tier: 2,
  version: "1.0.0",
  description: "Sites, domains, pages, menus, and publishing for websites",
  dependencies: ["cms"],
  capabilities: ["website.manage"],
  permissions: ["website.read", "website.write", "website.publish", "website.ai.generate"],
  menu: [
    {
      id: "website-sites",
      scope: "web",
      section: "website",
      labelKey: "nav.website",
      defaultLabel: "Website",
      route: "/website/sites",
      icon: "Globe",
      order: 20,
      requiresPermissions: ["website.read"],
    },
  ],
};
