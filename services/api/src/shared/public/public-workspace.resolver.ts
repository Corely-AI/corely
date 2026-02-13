import { Injectable } from "@nestjs/common";
import { PrismaService } from "@corely/data";
import type { ContextAwareRequest } from "../request-context";
import {
  publicWorkspaceNotPublishedError,
  publicWorkspaceNotResolvedError,
} from "./public-publish-rules";
import type {
  PublicWorkspaceContext,
  PublicWorkspaceResolutionMethod,
  PublicWorkspaceModules,
} from "./public-workspace.types";

const DEFAULT_PUBLIC_BASE_DOMAIN = "my.corely.one";
const PUBLIC_BASE_DOMAINS_ENV = "PUBLIC_WORKSPACE_BASE_DOMAINS";

@Injectable()
export class PublicWorkspaceResolver {
  constructor(private readonly prisma: PrismaService) {}

  async resolve(req: ContextAwareRequest): Promise<PublicWorkspaceContext> {
    const host = normalizeHost(pickHostHeader(req.headers ?? undefined));
    const path = resolvePath(req);
    const query = req.query as Record<string, string | string[] | undefined> | undefined;

    return this.resolveFromRequest({ host, path, query });
  }

  async resolveFromRequest(input: {
    host: string | null;
    path: string;
    query?: Record<string, string | string[] | undefined> | undefined;
  }): Promise<PublicWorkspaceContext> {
    const host = normalizeHost(input.host);
    const path = input.path;

    if (host) {
      const domainMatch = await this.prisma.workspaceDomain.findUnique({
        where: { domain: host },
        include: { workspace: true },
      });

      if (domainMatch?.workspace) {
        return this.buildContext(domainMatch.workspace, "custom-domain");
      }

      const subdomainSlug = extractWorkspaceSlug(host, getBaseDomains());
      if (subdomainSlug) {
        const workspace = await this.findWorkspaceBySlug(subdomainSlug);
        if (workspace) {
          return this.buildContext(workspace, "subdomain");
        }
      }
    }

    const pathSlug = parsePathSlug(path);
    if (pathSlug) {
      const workspace = await this.findWorkspaceBySlug(pathSlug);
      if (workspace) {
        return this.buildContext(workspace, "path");
      }
    }

    const querySlug = allowQueryFallback() ? pickQueryParam(input.query, "w") : undefined;
    if (querySlug) {
      const workspace = await this.findWorkspaceBySlug(querySlug);
      if (workspace) {
        return this.buildContext(workspace, "query");
      }
    }

    throw publicWorkspaceNotResolvedError();
  }

  private async findWorkspaceBySlug(slug: string) {
    const normalizedSlug = slug.trim().toLowerCase();
    if (!normalizedSlug) {
      return null;
    }
    return this.prisma.workspace.findFirst({
      where: { slug: normalizedSlug },
      select: {
        id: true,
        tenantId: true,
        slug: true,
        publicEnabled: true,
        publicModules: true,
      },
    });
  }

  private buildContext(
    workspace: {
      id: string;
      tenantId: string;
      slug: string | null;
      publicEnabled: boolean | null;
      publicModules: unknown;
    },
    method: PublicWorkspaceResolutionMethod
  ): PublicWorkspaceContext {
    if (!workspace.publicEnabled) {
      throw publicWorkspaceNotPublishedError();
    }

    const slug = workspace.slug ?? "";
    if (!slug) {
      throw publicWorkspaceNotResolvedError();
    }

    return {
      tenantId: workspace.tenantId,
      workspaceId: workspace.id,
      workspaceSlug: slug,
      resolutionMethod: method,
      publicEnabled: workspace.publicEnabled ?? false,
      publicModules: (workspace.publicModules as PublicWorkspaceModules | null) ?? undefined,
    };
  }
}

const pickHostHeader = (
  headers?: Record<string, string | string[] | undefined>
): string | undefined => {
  if (!headers) {
    return undefined;
  }
  return pickHeader(headers, "x-forwarded-host") ?? pickHeader(headers, "host");
};

const resolvePath = (req: ContextAwareRequest): string => {
  if (typeof req.originalUrl === "string" && req.originalUrl.startsWith("/w/")) {
    return req.originalUrl.split("?")[0] ?? "/";
  }
  if (typeof req.path === "string" && req.path.length > 0) {
    return req.path;
  }
  if (typeof req.url === "string" && req.url.length > 0) {
    return req.url.split("?")[0] ?? "/";
  }
  if (typeof req.originalUrl === "string" && req.originalUrl.length > 0) {
    return req.originalUrl.split("?")[0] ?? "/";
  }
  return "/";
};

const pickHeader = (
  headers: Record<string, string | string[] | undefined>,
  name: string
): string | undefined => {
  const value = headers[name];
  if (Array.isArray(value)) {
    return value.find((entry) => typeof entry === "string" && entry.length > 0);
  }
  return typeof value === "string" && value.length > 0 ? value : undefined;
};

const normalizeHost = (rawHost?: string | null): string | null => {
  if (!rawHost) {
    return null;
  }

  const first = rawHost.split(",")[0]?.trim();
  if (!first) {
    return null;
  }

  const normalized = first.replace(/:\d+$/, "").toLowerCase();
  return normalized.length > 0 ? normalized : null;
};

const getBaseDomains = (): string[] => {
  const rawDomains = process.env[PUBLIC_BASE_DOMAINS_ENV] || DEFAULT_PUBLIC_BASE_DOMAIN;

  return rawDomains
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter((entry) => entry.length > 0)
    .sort((a, b) => b.length - a.length);
};

const matchBaseDomain = (host: string, baseDomains: string[]): string | null => {
  for (const baseDomain of baseDomains) {
    if (host === baseDomain || host.endsWith(`.${baseDomain}`)) {
      return baseDomain;
    }
  }
  return null;
};

const extractWorkspaceSlug = (host: string, baseDomains: string[]): string | null => {
  const baseDomain = matchBaseDomain(host, baseDomains);
  if (!baseDomain || host === baseDomain) {
    return null;
  }

  const slugPart = host.slice(0, -1 * (baseDomain.length + 1));
  if (!slugPart || slugPart.includes(".")) {
    return null;
  }

  return slugPart.toLowerCase();
};

const parsePathSlug = (path: string): string | null => {
  const match = path.match(/^\/w\/([^/]+)(?:\/|$)/i);
  return match?.[1]?.toLowerCase() ?? null;
};

const pickQueryParam = (
  query: Record<string, string | string[] | undefined> | undefined,
  name: string
): string | undefined => {
  if (!query) {
    return undefined;
  }
  const value = query[name];
  if (Array.isArray(value)) {
    return value.find((entry) => typeof entry === "string" && entry.length > 0);
  }
  return typeof value === "string" && value.length > 0 ? value : undefined;
};

const allowQueryFallback = (): boolean =>
  process.env.PUBLIC_WORKSPACE_QUERY_ENABLED === "true" || process.env.NODE_ENV !== "production";
