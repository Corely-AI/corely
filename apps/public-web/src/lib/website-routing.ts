import { RESERVED_PUBLIC_PREFIXES } from "@corely/public-urls";

const LOCALE_PATTERN = /^([a-z]{2})(?:-([a-zA-Z]{2}))?$/;

export const WEBSITE_ROUTE_PREFIX = "/__website";

export const normalizeWebsitePath = (raw: string): string => {
  const trimmed = raw.trim();
  if (!trimmed) {
    return "/";
  }
  const withoutQuery = trimmed.split("?")[0]?.split("#")[0] ?? trimmed;
  let path = withoutQuery.startsWith("/") ? withoutQuery : `/${withoutQuery}`;
  if (path.length > 1 && path.endsWith("/")) {
    path = path.slice(0, -1);
  }
  return path;
};

export const normalizeWebsiteLocale = (raw: string): string | null => {
  const trimmed = raw.trim();
  if (!trimmed) {
    return null;
  }
  const match = trimmed.match(LOCALE_PATTERN);
  if (!match) {
    return null;
  }
  const language = match[1]!.toLowerCase();
  const region = match[2] ? match[2]!.toUpperCase() : undefined;
  return region ? `${language}-${region}` : language;
};

export const splitLocaleFromPath = (
  rawPath: string
): {
  path: string;
  locale?: string;
} => {
  const normalized = normalizeWebsitePath(rawPath);
  if (normalized === "/") {
    return { path: "/" };
  }

  const [first, ...rest] = normalized.slice(1).split("/");
  const locale = first ? normalizeWebsiteLocale(first) : null;
  if (!locale) {
    return { path: normalized };
  }

  const remaining = rest.length ? `/${rest.join("/")}` : "/";
  return { path: remaining, locale };
};

export const resolveLocaleFromAcceptLanguage = (
  headerValue: string | null | undefined
): string | null => {
  if (!headerValue) {
    return null;
  }
  const candidates = headerValue
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);

  for (const candidate of candidates) {
    const tag = candidate.split(";")[0]?.trim();
    if (!tag) {
      continue;
    }
    const normalized = normalizeWebsiteLocale(tag);
    if (normalized) {
      return normalized;
    }
  }

  return null;
};

export const buildWebsitePathFromSegments = (segments?: string[]): string => {
  if (!segments || segments.length === 0) {
    return "/";
  }
  return normalizeWebsitePath(`/${segments.join("/")}`);
};

export const buildWebsiteRewritePath = (pathname: string): string => {
  const normalized = normalizeWebsitePath(pathname);
  if (normalized === "/") {
    return WEBSITE_ROUTE_PREFIX;
  }
  return `${WEBSITE_ROUTE_PREFIX}${normalized}`;
};

export const isWebsiteInternalPath = (pathname: string): boolean =>
  normalizeWebsitePath(pathname).startsWith(WEBSITE_ROUTE_PREFIX);

export const shouldRewriteToWebsite = (input: {
  pathname: string;
  isWebsiteHost: boolean;
}): boolean => {
  if (!input.isWebsiteHost) {
    return false;
  }
  if (isWebsiteInternalPath(input.pathname)) {
    return false;
  }
  const normalized = normalizeWebsitePath(input.pathname);
  const firstSegment = normalized.split("/").filter(Boolean)[0];
  if (firstSegment && RESERVED_PUBLIC_PREFIXES.includes(firstSegment as any)) {
    return false;
  }
  return true;
};

export const isPreviewMode = (value: string | null | undefined): boolean => {
  if (!value) {
    return false;
  }
  const normalized = value.trim().toLowerCase();
  return ["1", "true", "yes", "on", "preview"].includes(normalized);
};
