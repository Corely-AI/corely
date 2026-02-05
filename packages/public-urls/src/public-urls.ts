export const RESERVED_PUBLIC_PREFIXES = [
  "rentals",
  "portfolio",
  "cms",
  "api",
  "auth",
  "w",
] as const;

export type ReservedPublicPrefix = (typeof RESERVED_PUBLIC_PREFIXES)[number];

export type PublicUrlKind = "website" | "rentals" | "portfolio" | "cms";

export type BuildPublicUrlInput = {
  workspaceSlug: string;
  kind: PublicUrlKind;
  slug?: string;
  websiteSlug?: string;
  pagePath?: string;
  isDefaultWebsite?: boolean;
  env?: "dev" | "prod";
  originOverride?: string;
  usePathWorkspace?: boolean;
  publicWebBaseUrl?: string;
  publicRootDomain?: string;
};

export type PublicUrlErrorCode =
  | "PublicUrl:InvalidWorkspace"
  | "PublicUrl:InvalidSlug"
  | "PublicUrl:ReservedPrefix"
  | "PublicUrl:MissingSlug"
  | "PublicUrl:InvalidPath";

export class PublicUrlError extends Error {
  constructor(
    public readonly code: PublicUrlErrorCode,
    message: string,
    public readonly details?: Record<string, string | undefined>
  ) {
    super(message);
    this.name = "PublicUrlError";
  }
}

const DEFAULT_PUBLIC_WEB_BASE_URL = "http://localhost:8082";
const DEFAULT_PUBLIC_ROOT_DOMAIN = "my.corely.one";
const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const normalizeOrigin = (value: string, defaultProtocol: "http" | "https") => {
  const trimmed = value.trim().replace(/\/$/, "");
  if (!trimmed) {
    return trimmed;
  }
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }
  return `${defaultProtocol}://${trimmed}`;
};

const resolveEnv = (env?: "dev" | "prod") => {
  if (env) {
    return env;
  }
  if (typeof process !== "undefined" && process.env?.NODE_ENV === "production") {
    return "prod";
  }
  return "dev";
};

const normalizePath = (value?: string): string => {
  if (!value) {
    return "/";
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return "/";
  }
  const withoutQuery = trimmed.split("?")[0]?.split("#")[0] ?? trimmed;
  const withSlash = withoutQuery.startsWith("/") ? withoutQuery : `/${withoutQuery}`;
  return withSlash === "/" ? "/" : withSlash.replace(/\/$/, "");
};

const ensureWorkspaceSlug = (workspaceSlug: string) => {
  const trimmed = workspaceSlug.trim();
  if (!trimmed) {
    throw new PublicUrlError("PublicUrl:InvalidWorkspace", "workspaceSlug is required");
  }
  return trimmed;
};

const ensureSlug = (value: string, label: string) => {
  const trimmed = value.trim().toLowerCase();
  if (!trimmed) {
    throw new PublicUrlError("PublicUrl:InvalidSlug", `${label} is required`);
  }
  if (trimmed.includes("/")) {
    throw new PublicUrlError("PublicUrl:InvalidSlug", `${label} must be a single segment`, {
      slug: trimmed,
    });
  }
  if (!SLUG_REGEX.test(trimmed)) {
    throw new PublicUrlError(
      "PublicUrl:InvalidSlug",
      `${label} must be lowercase letters, numbers, or dashes`,
      { slug: trimmed }
    );
  }
  return trimmed;
};

const ensureWebsiteSlug = (value: string) => {
  const trimmed = ensureSlug(value, "websiteSlug");
  for (const prefix of RESERVED_PUBLIC_PREFIXES) {
    if (trimmed === prefix || trimmed.startsWith(`${prefix}/`)) {
      throw new PublicUrlError("PublicUrl:ReservedPrefix", `Slug is reserved: ${prefix}`, {
        slug: trimmed,
      });
    }
  }
  return trimmed;
};

const ensureWebsitePagePath = (value: string) => {
  const normalized = normalizePath(value);
  const firstSegment = normalized.split("/").filter(Boolean)[0];
  if (firstSegment && RESERVED_PUBLIC_PREFIXES.includes(firstSegment as ReservedPublicPrefix)) {
    throw new PublicUrlError(
      "PublicUrl:InvalidPath",
      `Page path starts with reserved prefix: ${firstSegment}`,
      { path: normalized }
    );
  }
  return normalized;
};

const resolveOrigin = (input: {
  workspaceSlug: string;
  env: "dev" | "prod";
  originOverride?: string;
  publicWebBaseUrl?: string;
  publicRootDomain?: string;
  usePathWorkspace: boolean;
}) => {
  if (input.originOverride) {
    return normalizeOrigin(input.originOverride, "https");
  }

  if (input.usePathWorkspace || input.env === "dev") {
    return normalizeOrigin(input.publicWebBaseUrl ?? DEFAULT_PUBLIC_WEB_BASE_URL, "http");
  }

  const rootDomain = (input.publicRootDomain ?? DEFAULT_PUBLIC_ROOT_DOMAIN).trim();
  return normalizeOrigin(`${input.workspaceSlug}.${rootDomain}`, "https");
};

const buildPath = (parts: string[]) => {
  const joined = parts
    .map((part) => part.trim().replace(/^\/+|\/+$/g, ""))
    .filter(Boolean)
    .join("/");
  return `/${joined}`.replace(/\/+$/, "");
};

export const buildPublicUrl = (input: BuildPublicUrlInput): string => {
  const workspaceSlug = ensureWorkspaceSlug(input.workspaceSlug);
  const env = resolveEnv(input.env);
  const usePathWorkspace = input.usePathWorkspace ?? env === "dev";
  const origin = resolveOrigin({
    workspaceSlug,
    env,
    originOverride: input.originOverride,
    publicWebBaseUrl: input.publicWebBaseUrl,
    publicRootDomain: input.publicRootDomain,
    usePathWorkspace,
  });

  if (!origin) {
    throw new PublicUrlError("PublicUrl:InvalidWorkspace", "Unable to resolve origin");
  }

  if (input.kind === "rentals" || input.kind === "portfolio" || input.kind === "cms") {
    if (!input.slug) {
      throw new PublicUrlError("PublicUrl:MissingSlug", `${input.kind} slug is required`);
    }
    const slug = ensureSlug(input.slug, `${input.kind} slug`);
    const pathParts = usePathWorkspace
      ? ["w", workspaceSlug, input.kind, slug]
      : [input.kind, slug];
    return new URL(buildPath(pathParts), origin).toString();
  }

  const isDefaultWebsite = Boolean(input.isDefaultWebsite);
  const websiteSlug = input.websiteSlug ? ensureWebsiteSlug(input.websiteSlug) : "";

  if (!websiteSlug && (usePathWorkspace || !isDefaultWebsite)) {
    throw new PublicUrlError("PublicUrl:MissingSlug", "websiteSlug is required", {
      websiteSlug: input.websiteSlug,
    });
  }

  const pagePath = normalizePath(input.pagePath);
  const validatedPagePath =
    !usePathWorkspace && isDefaultWebsite ? ensureWebsitePagePath(pagePath) : pagePath;

  if (usePathWorkspace) {
    const pathParts = ["w", workspaceSlug, websiteSlug, validatedPagePath];
    return new URL(buildPath(pathParts), origin).toString();
  }

  if (isDefaultWebsite) {
    return new URL(validatedPagePath, origin).toString();
  }

  const pathParts = [websiteSlug, validatedPagePath];
  return new URL(buildPath(pathParts), origin).toString();
};

export const buildPublicWebsiteUrl = (input: Omit<BuildPublicUrlInput, "kind">) =>
  buildPublicUrl({ ...input, kind: "website" });

export const buildPublicRentalUrl = (
  input: Omit<BuildPublicUrlInput, "kind" | "slug"> & {
    slug: string;
  }
) => buildPublicUrl({ ...input, kind: "rentals" });

export const buildPublicPortfolioUrl = (
  input: Omit<BuildPublicUrlInput, "kind" | "slug"> & { slug: string }
) => buildPublicUrl({ ...input, kind: "portfolio" });

export const buildPublicCmsUrl = (
  input: Omit<BuildPublicUrlInput, "kind" | "slug"> & {
    slug: string;
  }
) => buildPublicUrl({ ...input, kind: "cms" });
