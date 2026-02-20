import type { ReactNode } from "react";
import Link from "next/link";
import type { WebsiteBlockHiddenOn, WebsiteMenuPublic } from "@corely/contracts";
import { cn } from "@/lib/utils";
import type { WebsiteRenderContext } from "../../../runtime.types";

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

export type ButtonVariant =
  | "default"
  | "destructive"
  | "outline"
  | "secondary"
  | "ghost"
  | "link"
  | "hero"
  | "hero-outline"
  | "gold";

export type ButtonSize = "default" | "sm" | "lg" | "xl" | "icon";

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

export const isExternalLink = (href: string): boolean =>
  href.startsWith("http://") ||
  href.startsWith("https://") ||
  href.startsWith("mailto:") ||
  href.startsWith("tel:");

export const normalizeBasePath = (basePath?: string): string | null => {
  if (!basePath) {
    return null;
  }
  return basePath.endsWith("/") ? basePath.slice(0, -1) : basePath;
};

export const resolveInternalHref = (href: string, basePath?: string) => {
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

export const hiddenClass = (hiddenOn: WebsiteBlockHiddenOn | undefined): string => {
  if (hiddenOn?.mobile && hiddenOn?.desktop) {
    return "hidden";
  }
  if (hiddenOn?.mobile) {
    return "hidden md:block";
  }
  if (hiddenOn?.desktop) {
    return "md:hidden";
  }
  return "";
};

export const variantClass = (variant?: string): string => {
  if (variant === "compact") {
    return "py-10 md:py-12";
  }
  if (variant === "minimal") {
    return "py-8 md:py-10";
  }
  if (variant === "highlight") {
    return "py-20 md:py-28";
  }
  return "";
};

export const sectionClass = (props: CommonBlockProps, baseClassName?: string) =>
  cn(baseClassName, hiddenClass(props.hiddenOn), variantClass(props.variant), props.className);

export const buttonClass = ({
  variant = "default",
  size = "default",
  className,
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
}) => {
  const base =
    "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50";

  const variantMap: Record<ButtonVariant, string> = {
    default: "bg-primary text-primary-foreground hover:bg-primary/90",
    destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
    outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
    secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
    ghost: "hover:bg-accent hover:text-accent-foreground",
    link: "text-primary underline-offset-4 hover:underline",
    hero: "bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg hover:shadow-xl transition-all duration-300 text-base font-semibold rounded-xl",
    "hero-outline":
      "border-2 border-primary text-primary bg-primary/5 hover:bg-primary/10 transition-all duration-300 text-base font-semibold rounded-xl",
    gold: "badge-gold font-semibold hover:opacity-90 transition-all duration-300 rounded-xl",
  };

  const sizeMap: Record<ButtonSize, string> = {
    default: "h-10 px-4 py-2",
    sm: "h-9 rounded-md px-3",
    lg: "h-12 rounded-xl px-8 text-base",
    xl: "h-14 rounded-xl px-10 text-lg",
    icon: "h-10 w-10",
  };

  return cn(base, variantMap[variant], sizeMap[size], className);
};

export const LinkOrAnchor = ({
  href,
  basePath,
  className,
  children,
}: {
  href: string;
  basePath?: string;
  className?: string;
  children: ReactNode;
}) => {
  if (isExternalLink(href)) {
    return (
      <a href={href} className={className} target="_blank" rel="noopener noreferrer">
        {children}
      </a>
    );
  }

  return (
    <Link href={resolveInternalHref(href, basePath)} className={className}>
      {children}
    </Link>
  );
};

export const MenuAnchor = ({
  href,
  label,
  basePath,
  className,
}: {
  href: string;
  label: string;
  basePath?: string;
  className?: string;
}) => (
  <LinkOrAnchor
    href={href}
    basePath={basePath}
    className={cn("text-sm font-medium transition-colors hover:text-primary", className)}
  >
    {label}
  </LinkOrAnchor>
);
