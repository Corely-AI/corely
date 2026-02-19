import React from "react";
import Link from "next/link";
import type { WebsiteMenuPublic, WebsiteSiteSettings } from "@corely/contracts";
import { ThemeToggle } from "@/components/theme-toggle";
import { buildPublicFileUrl } from "@/lib/public-api";

type WebsiteMenuItem = {
  label: string;
  href: string;
};

const normalizeMenuItems = (itemsJson: unknown): WebsiteMenuItem[] => {
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

const resolveMenu = (menus: WebsiteMenuPublic[], name: string): WebsiteMenuPublic | null => {
  const normalized = name.toLowerCase();
  return menus.find((menu) => menu.name.toLowerCase() === normalized) ?? null;
};

const isExternalLink = (href: string): boolean =>
  href.startsWith("http://") || href.startsWith("https://");

const normalizeBasePath = (basePath?: string): string | null => {
  if (!basePath) {
    return null;
  }
  return basePath.endsWith("/") ? basePath.slice(0, -1) : basePath;
};

const resolveInternalHref = (href: string, basePath?: string) => {
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

const MenuLink = ({ item, basePath }: { item: WebsiteMenuItem; basePath?: string }) => {
  if (isExternalLink(item.href)) {
    return (
      <a
        href={item.href}
        className="text-sm font-medium text-muted-foreground transition hover:text-foreground"
        target="_blank"
        rel="noopener noreferrer"
      >
        {item.label}
      </a>
    );
  }
  return (
    <Link
      href={resolveInternalHref(item.href, basePath)}
      className="text-sm font-medium text-muted-foreground transition hover:text-foreground"
    >
      {item.label}
    </Link>
  );
};

export const PublicSiteLayout = ({
  menus,
  settings,
  host,
  previewMode,
  basePath,
  children,
}: {
  menus: WebsiteMenuPublic[];
  settings?: WebsiteSiteSettings;
  host?: string | null;
  previewMode?: boolean;
  basePath?: string;
  children: React.ReactNode;
}) => {
  const common = settings?.common;
  const headerMenu = resolveMenu(menus, "header");
  const footerMenu = resolveMenu(menus, "footer");
  const headerItems = normalizeMenuItems(headerMenu?.itemsJson);
  const footerItems = normalizeMenuItems(footerMenu?.itemsJson);
  const resolvedHost = host ?? (typeof window !== "undefined" ? window.location.host : null);
  const brandLabel = common?.siteTitle ?? resolvedHost?.split(":")[0] ?? "Website";
  const logoSrc =
    common?.logo?.url ??
    (common?.logo?.fileId ? buildPublicFileUrl(common.logo.fileId) : undefined);
  const showLogo = common?.header?.showLogo ?? true;
  const socials = Object.entries(common?.socials ?? {}).filter(
    ([, value]) => typeof value === "string" && value.trim().length > 0
  );
  const homeHref = resolveInternalHref("/", basePath);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border/60 bg-background/80 backdrop-blur sticky top-0 z-40">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
          <Link href={homeHref} className="flex items-center gap-3 text-lg font-semibold tracking-tight">
            {showLogo && logoSrc ? (
              <img
                src={logoSrc}
                alt={common?.logo?.alt ?? brandLabel}
                className="h-8 w-8 rounded-md object-contain"
              />
            ) : null}
            <span>{brandLabel}</span>
          </Link>
          <nav className="hidden items-center gap-6 md:flex">
            {headerItems.map((item) => (
              <MenuLink key={`${item.href}-${item.label}`} item={item} basePath={basePath} />
            ))}
          </nav>
          <div className="flex items-center gap-3">
            {common?.header?.cta ? (
              <a
                href={common.header.cta.href}
                className="rounded-md border border-border/80 px-3 py-1.5 text-sm font-medium transition hover:bg-muted"
              >
                {common.header.cta.label}
              </a>
            ) : null}
            <ThemeToggle />
            {previewMode ? (
              <span className="rounded-full bg-accent/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-accent">
                Preview mode
              </span>
            ) : null}
          </div>
        </div>
      </header>

      <main className="min-h-[70vh]">{children}</main>

      <footer className="border-t border-border/60 py-8">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-6">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div className="text-sm text-muted-foreground">
              {common?.footer?.copyrightText ?? brandLabel}
            </div>
            <div className="flex flex-wrap gap-4">
              {footerItems.map((item) => (
                <MenuLink key={`${item.href}-${item.label}`} item={item} basePath={basePath} />
              ))}
            </div>
          </div>
          <div className="flex flex-wrap gap-4">
            {socials.map(([key, value]) => {
              const href =
                key === "email"
                  ? value.startsWith("mailto:")
                    ? value
                    : `mailto:${value}`
                  : value;
              return (
                <a
                  key={key}
                  href={href}
                  className="text-xs text-muted-foreground transition hover:text-foreground"
                  target={key === "email" ? undefined : "_blank"}
                  rel={key === "email" ? undefined : "noopener noreferrer"}
                >
                  {key}
                </a>
              );
            })}
          </div>
        </div>
      </footer>
    </div>
  );
};
