import type { WebsiteBlockHiddenOn, WebsiteMenuPublic } from "@corely/contracts";
import type { WebsiteRenderContext } from "../runtime.types";

export type CommonBlockProps = {
  anchorId?: string;
  className?: string;
  hiddenOn?: WebsiteBlockHiddenOn;
  variant?: string;
};

export type RuntimeProps = Pick<WebsiteRenderContext, "menus" | "settings" | "host" | "basePath">;

export type WebsiteMenuItem = {
  label: string;
  href: string;
};

export const normalizeMenuItems = (itemsJson: unknown): WebsiteMenuItem[] => {
  if (!Array.isArray(itemsJson)) {
    return [];
  }

  return itemsJson
    .map((item) => {
      if (!item || typeof item !== "object") {
        return null;
      }
      const candidate = item as { label?: unknown; href?: unknown };
      if (typeof candidate.label !== "string" || typeof candidate.href !== "string") {
        return null;
      }
      return { label: candidate.label, href: candidate.href };
    })
    .filter((item): item is WebsiteMenuItem => Boolean(item));
};

export const resolveMenu = (
  menus: WebsiteMenuPublic[] | undefined,
  name: string
): WebsiteMenuPublic | null => {
  if (!menus || menus.length === 0) {
    return null;
  }

  const normalized = name.toLowerCase();
  return menus.find((menu) => menu.name.toLowerCase() === normalized) ?? null;
};

export const normalizeBasePath = (basePath?: string): string | null => {
  if (!basePath) {
    return null;
  }
  return basePath.endsWith("/") ? basePath.slice(0, -1) : basePath;
};

export const resolveInternalHref = (href: string, basePath?: string): string => {
  if (href.startsWith("#")) {
    const normalizedBase = normalizeBasePath(basePath);
    return normalizedBase ? `${normalizedBase}/${href}`.replace("/#", "#") : href;
  }

  const normalized = href.startsWith("/") ? href : `/${href}`;
  const normalizedBase = normalizeBasePath(basePath);
  if (!normalizedBase) {
    return href;
  }
  if (normalized === "/") {
    return normalizedBase;
  }
  return `${normalizedBase}${normalized}`;
};
