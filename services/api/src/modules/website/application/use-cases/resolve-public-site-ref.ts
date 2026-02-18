import type { WebsitePage, WebsiteSite } from "@corely/contracts";
import { RESERVED_PUBLIC_PREFIXES } from "@corely/public-urls";
import type { PublicWorkspaceResolver } from "@/shared/public";
import type { WebsiteDomainRepositoryPort } from "../ports/domain-repository.port";
import type { WebsitePageRepositoryPort } from "../ports/page-repository.port";
import type { WebsiteSiteRepositoryPort } from "../ports/site-repository.port";
import { normalizeHostname, normalizeLocale, normalizePath } from "../../domain/website.validators";

export type PublicWebsiteResolverDeps = {
  domainRepo: WebsiteDomainRepositoryPort;
  siteRepo: WebsiteSiteRepositoryPort;
  pageRepo: WebsitePageRepositoryPort;
  publicWorkspaceResolver: PublicWorkspaceResolver;
};

export type ResolvePublicWebsiteSiteRefInput = {
  host: string;
  path: string;
  locale?: string;
};

export type ResolvedPublicWebsiteSiteRef = {
  host: string;
  path: string;
  resolvedPath: string;
  locale: string;
  site: WebsiteSite;
  page: WebsitePage | null;
};

const resolveWorkspaceContext = async (
  resolver: PublicWorkspaceResolver,
  host: string
): Promise<{ tenantId: string } | null> => {
  try {
    return await resolver.resolveFromRequest({
      host,
      path: "/",
    });
  } catch {
    // Ignore and attempt dev-style workspace resolution below.
  }

  try {
    return await resolver.resolveFromRequest({
      host: null,
      path: `/w/${host}`,
    });
  } catch {
    return null;
  }
};

export const resolvePublicWebsiteSiteRef = async (
  deps: PublicWebsiteResolverDeps,
  input: ResolvePublicWebsiteSiteRefInput
): Promise<ResolvedPublicWebsiteSiteRef | null> => {
  const host = normalizeHostname(input.host);
  const path = normalizePath(input.path);

  const domain = await deps.domainRepo.findByHostname(null, host);
  let site = domain ? await deps.siteRepo.findById(domain.tenantId, domain.siteId) : null;
  let resolvedPath = path;

  if (!site) {
    const workspace = await resolveWorkspaceContext(deps.publicWorkspaceResolver, host);
    if (!workspace) {
      return null;
    }

    const segments = path.split("/").filter(Boolean);
    const candidateSlug = segments[0]?.toLowerCase();
    const isReserved = candidateSlug
      ? RESERVED_PUBLIC_PREFIXES.includes(
          candidateSlug as (typeof RESERVED_PUBLIC_PREFIXES)[number]
        )
      : false;

    if (candidateSlug && !isReserved) {
      const candidateSite = await deps.siteRepo.findBySlug(workspace.tenantId, candidateSlug);
      if (candidateSite) {
        site = candidateSite;
        resolvedPath = segments.length > 1 ? `/${segments.slice(1).join("/")}` : "/";
      }
    }

    if (!site) {
      site = await deps.siteRepo.findDefaultByTenant(workspace.tenantId);
      resolvedPath = path;
    }
  }

  if (!site) {
    return null;
  }

  const locale = normalizeLocale(input.locale ?? site.defaultLocale);
  const page = await deps.pageRepo.findByPath(site.tenantId, site.id, resolvedPath, locale);

  return {
    host,
    path,
    resolvedPath,
    locale,
    site,
    page,
  };
};
