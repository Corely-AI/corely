import type { AppManifest } from "@corely/contracts";

export const cmsAppManifest: AppManifest = {
  appId: "cms",
  name: "CMS",
  tier: 1,
  version: "1.0.0",
  description: "Content management for posts and comments",
  dependencies: [],
  capabilities: ["cms.manage"],
  permissions: ["cms.posts.read", "cms.posts.manage", "cms.comments.moderate", "cms.posts.publish"],
  menu: [
    {
      id: "cms-posts",
      scope: "web",
      section: "cms",
      labelKey: "nav.cms.posts",
      defaultLabel: "Posts",
      route: "/cms/posts",
      icon: "FileText",
      order: 15,
      requiresPermissions: ["cms.posts.read"],
    },
    {
      id: "cms-comments",
      scope: "web",
      section: "cms",
      labelKey: "nav.cms.comments",
      defaultLabel: "Comments",
      route: "/cms/comments",
      icon: "MessageSquare",
      order: 16,
      requiresPermissions: ["cms.comments.moderate"],
    },
  ],
};
