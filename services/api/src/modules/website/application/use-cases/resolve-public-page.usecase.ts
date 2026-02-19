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
import { buildSeo } from "../../domain/website.validators";
import { resolvePublicWebsiteSiteRef } from "./resolve-public-site-ref";

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
    const resolved = await resolvePublicWebsiteSiteRef(this.deps, {
      host: input.host,
      path: input.path,
      locale: input.locale,
    });
    if (!resolved || !resolved.page) {
      return err(new NotFoundError("Page not found", undefined, "Website:PageNotFound"));
    }
    const { site, page, locale } = resolved;

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
