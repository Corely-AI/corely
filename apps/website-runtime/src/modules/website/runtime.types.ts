import type { WebsiteMenuPublic, WebsiteSiteSettings } from "@corely/contracts";

export type WebsiteRenderContext = {
  menus?: WebsiteMenuPublic[];
  settings?: WebsiteSiteSettings;
  host?: string | null;
  basePath?: string;
  templateKey?: string;
};
