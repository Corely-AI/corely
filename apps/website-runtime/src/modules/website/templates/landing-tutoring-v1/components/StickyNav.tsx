import Link from "next/link";
import type { WebsiteSiteSettings } from "@corely/contracts";
import { Button } from "@/components/ui/button";
import { buildPublicFileUrl } from "@/lib/public-api";
import {
  type CommonBlockProps,
  type RuntimeProps,
  MenuAnchor,
  normalizeMenuItems,
  resolveMenu,
  resolveInternalHref,
  sectionClass,
} from "./shared";

type StickyNavProps = CommonBlockProps &
  RuntimeProps & { navLabel?: string; ctaLabel?: string; ctaHref?: string };

export const StickyNav = (props: StickyNavProps) => {
  const common: WebsiteSiteSettings["common"] | undefined = props.settings?.common;
  const headerMenu = resolveMenu(props.menus, "header");
  const headerItems = normalizeMenuItems(headerMenu?.itemsJson);
  const siteTitle = props.navLabel ?? common?.siteTitle ?? "DEUTSCH LIEBE";
  const logoSrc =
    common?.logo?.url ??
    (common?.logo?.fileId ? buildPublicFileUrl(common.logo.fileId) : undefined);
  const ctaLabel = props.ctaLabel ?? common?.header?.cta?.label ?? "Nhận tư vấn";
  const ctaHref = props.ctaHref ?? common?.header?.cta?.href ?? "/contact";

  const navLinks =
    headerItems.length > 0
      ? headerItems.slice(0, 3)
      : [
          { label: "Điểm khác biệt", href: "/#diem-khac-biet" },
          { label: "Đừng học 1:1", href: "/#dung-hoc-1-1" },
          { label: "Wall of Love", href: "/wall-of-love" },
        ];

  return (
    <nav
      id={props.anchorId}
      className={sectionClass(
        props,
        "sticky top-0 z-50 bg-card/90 backdrop-blur-md border-b border-border"
      )}
    >
      <div className="container mx-auto flex items-center justify-between h-14 px-4">
        <Link
          href={resolveInternalHref("/", props.basePath)}
          className="font-bold text-lg tracking-tight hover:opacity-80 transition-opacity flex items-center gap-2"
        >
          {logoSrc ? (
            <img src={logoSrc} alt={siteTitle} className="h-8 w-auto object-contain" />
          ) : (
            <>
              {siteTitle} <span className="inline-block">🇩🇪❤️</span>
            </>
          )}
        </Link>
        <div className="flex items-center gap-6">
          {navLinks.map((item) => (
            <MenuAnchor
              key={`${item.href}-${item.label}`}
              href={item.href}
              label={item.label}
              basePath={props.basePath}
              className="hidden sm:block"
            />
          ))}
          <Button variant="hero" size="sm" asChild>
            <Link href={resolveInternalHref(ctaHref, props.basePath)}>{ctaLabel}</Link>
          </Button>
        </div>
      </div>
    </nav>
  );
};

export default StickyNav;
