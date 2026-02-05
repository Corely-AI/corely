import {
  BaseUseCase,
  type LoggerPort,
  type Result,
  type UseCaseContext,
  type UseCaseError,
  NotFoundError,
  ValidationError,
  ok,
  err,
} from "@corely/kernel";
import type { ResolveWebsitePublicInput, ResolveWebsitePublicOutput } from "@corely/contracts";
import type { WebsiteDomainRepositoryPort } from "../ports/domain-repository.port";
import type { WebsiteSiteRepositoryPort } from "../ports/site-repository.port";
import type { WebsitePageRepositoryPort } from "../ports/page-repository.port";
import type { WebsiteSnapshotRepositoryPort } from "../ports/snapshot-repository.port";
import type { WebsiteMenuRepositoryPort } from "../ports/menu-repository.port";
import type { CmsReadPort } from "../ports/cms-read.port";
import { type PublicWorkspaceResolver } from "@/shared/public";
import { RESERVED_PUBLIC_PREFIXES } from "@corely/public-urls";
import {
  buildSeo,
  normalizeHostname,
  normalizeLocale,
  normalizePath,
} from "../../domain/website.validators";

type Deps = {
  logger: LoggerPort;
  domainRepo: WebsiteDomainRepositoryPort;
  siteRepo: WebsiteSiteRepositoryPort;
  pageRepo: WebsitePageRepositoryPort;
  snapshotRepo: WebsiteSnapshotRepositoryPort;
  menuRepo: WebsiteMenuRepositoryPort;
  cmsRead: CmsReadPort;
  publicWorkspaceResolver: PublicWorkspaceResolver;
};

export class ResolveWebsitePublicPageUseCase extends BaseUseCase<
  ResolveWebsitePublicInput,
  ResolveWebsitePublicOutput
> {
  constructor(protected readonly deps: Deps) {
    super({ logger: deps.logger });
  }

  private async resolveWorkspaceContext(host: string) {
    try {
      return await this.deps.publicWorkspaceResolver.resolveFromRequest({
        host,
        path: "/",
      });
    } catch {
      // Ignore and attempt dev-style workspace resolution below.
    }
    try {
      return await this.deps.publicWorkspaceResolver.resolveFromRequest({
        host: null,
        path: `/w/${host}`,
      });
    } catch {
      return null;
    }
  }

  protected validate(input: ResolveWebsitePublicInput): ResolveWebsitePublicInput {
    if (!input.host?.trim()) {
      throw new ValidationError("host is required", undefined, "Website:InvalidHost");
    }
    if (!input.path?.trim()) {
      throw new ValidationError("path is required", undefined, "Website:InvalidPath");
    }
    return input;
  }

  protected async handle(
    input: ResolveWebsitePublicInput,
    _ctx: UseCaseContext
  ): Promise<Result<ResolveWebsitePublicOutput, UseCaseError>> {
    const host = normalizeHostname(input.host);
    const path = normalizePath(input.path);

    const domain = await this.deps.domainRepo.findByHostname(null, host);
    let site = domain ? await this.deps.siteRepo.findById(domain.tenantId, domain.siteId) : null;
    let resolvedPath = path;

    if (!site) {
      const workspace = await this.resolveWorkspaceContext(host);
      if (!workspace) {
        return err(new NotFoundError("Page not found", undefined, "Website:PageNotFound"));
      }

      const segments = path.split("/").filter(Boolean);
      const candidateSlug = segments[0]?.toLowerCase();
      const isReserved = candidateSlug
        ? RESERVED_PUBLIC_PREFIXES.includes(
            candidateSlug as (typeof RESERVED_PUBLIC_PREFIXES)[number]
          )
        : false;

      if (candidateSlug && !isReserved) {
        const candidateSite = await this.deps.siteRepo.findBySlug(
          workspace.tenantId,
          candidateSlug
        );
        if (candidateSite) {
          site = candidateSite;
          resolvedPath = segments.length > 1 ? `/${segments.slice(1).join("/")}` : "/";
        }
      }

      if (!site) {
        site = await this.deps.siteRepo.findDefaultByTenant(workspace.tenantId);
        resolvedPath = path;
      }
    }

    if (!site) {
      return err(new NotFoundError("Page not found", undefined, "Website:PageNotFound"));
    }

    const locale = normalizeLocale(input.locale ?? site.defaultLocale);

    const page = await this.deps.pageRepo.findByPath(site.tenantId, site.id, resolvedPath, locale);
    if (!page) {
      return err(new NotFoundError("Page not found", undefined, "Website:PageNotFound"));
    }

    const menus = await this.deps.menuRepo.listBySite(site.tenantId, site.id);
    const localeMenus = menus.filter((menu) => menu.locale === locale);
    const resolvedMenus = localeMenus.length
      ? localeMenus
      : menus.filter((menu) => menu.locale === site.defaultLocale);

    if (input.mode === "preview") {
      const cmsPayload = await this.deps.cmsRead.getEntryForWebsiteRender({
        tenantId: site.tenantId,
        entryId: page.cmsEntryId,
        locale,
        mode: "preview",
      });

      return ok({
        siteId: site.id,
        siteSlug: site.slug,
        pageId: page.id,
        path: page.path,
        locale,
        template: page.template,
        payloadJson: cmsPayload,
        seo: buildSeo(page),
        menus: resolvedMenus.map((menu) => ({
          name: menu.name,
          locale: menu.locale,
          itemsJson: menu.itemsJson,
        })),
        snapshotVersion: null,
      });
    }

    if (page.status !== "PUBLISHED") {
      return err(new NotFoundError("Page not found", undefined, "Website:PageNotFound"));
    }

    const snapshot = await this.deps.snapshotRepo.findLatest(site.tenantId, page.id);
    if (!snapshot) {
      return err(new NotFoundError("Page not found", undefined, "Website:PageNotFound"));
    }

    const snapshotPayload = snapshot.payloadJson as {
      template?: string;
      seo?: { title?: string | null; description?: string | null; imageFileId?: string | null };
      content?: unknown;
    };

    return ok({
      siteId: site.id,
      siteSlug: site.slug,
      pageId: page.id,
      path: page.path,
      locale,
      template: snapshotPayload?.template ?? page.template,
      payloadJson: snapshotPayload?.content ?? snapshot.payloadJson,
      seo: snapshotPayload?.seo ?? buildSeo(page),
      menus: resolvedMenus.map((menu) => ({
        name: menu.name,
        locale: menu.locale,
        itemsJson: menu.itemsJson,
      })),
      snapshotVersion: snapshot.version,
    });
  }
}
