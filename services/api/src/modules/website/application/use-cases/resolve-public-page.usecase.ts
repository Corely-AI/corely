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
import type { WebsitePublicFileUrlPort } from "../ports/public-file-url.port";
import type { CmsReadPort } from "../ports/cms-read.port";
import type { WebsiteCustomAttributesPort } from "../ports/custom-attributes.port";
import { type PublicWorkspaceResolver } from "@/shared/public";
import { buildSeo } from "../../domain/website.validators";
import {
  buildWebsiteSiteSettings,
  WEBSITE_SITE_SETTINGS_ENTITY_TYPE,
} from "../../domain/site-settings";
import {
  extractWebsitePageContentFromCmsPayload,
  normalizeWebsitePageContent,
} from "../../domain/page-content";
import { isWebsitePreviewTokenValid } from "../../domain/preview-token";
import { withResolvedSiteAssetUrls } from "./site-settings-assets";
import { resolvePublicWebsiteSiteRef } from "./resolve-public-site-ref";

type Deps = {
  logger: LoggerPort;
  domainRepo: WebsiteDomainRepositoryPort;
  siteRepo: WebsiteSiteRepositoryPort;
  pageRepo: WebsitePageRepositoryPort;
  snapshotRepo: WebsiteSnapshotRepositoryPort;
  menuRepo: WebsiteMenuRepositoryPort;
  publicFileUrlPort: WebsitePublicFileUrlPort;
  cmsRead: CmsReadPort;
  customAttributes: WebsiteCustomAttributesPort;
  publicWorkspaceResolver: PublicWorkspaceResolver;
};

type PublicMenu = {
  name: string;
  locale: string;
  itemsJson: unknown;
};

const toPublicMenus = (menus: unknown): PublicMenu[] => {
  if (!Array.isArray(menus)) {
    return [];
  }
  return menus
    .map((menu) => {
      if (!menu || typeof menu !== "object") {
        return null;
      }
      const candidate = menu as { name?: unknown; locale?: unknown; itemsJson?: unknown };
      if (typeof candidate.name !== "string" || typeof candidate.locale !== "string") {
        return null;
      }
      return {
        name: candidate.name,
        locale: candidate.locale,
        itemsJson: candidate.itemsJson ?? [],
      };
    })
    .filter((menu): menu is PublicMenu => Boolean(menu));
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
    const customSettings = await this.deps.customAttributes.getAttributes({
      tenantId: site.tenantId,
      entityType: WEBSITE_SITE_SETTINGS_ENTITY_TYPE,
      entityId: site.id,
    });
    const settings = buildWebsiteSiteSettings({
      siteName: site.name,
      brandingJson: site.brandingJson,
      themeJson: site.themeJson,
      custom: customSettings,
    });
    const resolvedSettings = await withResolvedSiteAssetUrls(settings, this.deps.publicFileUrlPort);

    const menus = await this.deps.menuRepo.listBySite(site.tenantId, site.id);
    const localeMenus = menus.filter((menu) => menu.locale === locale);
    const resolvedMenus = localeMenus.length
      ? localeMenus
      : menus.filter((menu) => menu.locale === site.defaultLocale);

    if (input.mode === "preview") {
      if (!isWebsitePreviewTokenValid(input.token)) {
        return err(
          new ValidationError("preview token is invalid", undefined, "Website:InvalidPreviewToken")
        );
      }

      const cmsPayload = await this.deps.cmsRead.getEntryForWebsiteRender({
        tenantId: site.tenantId,
        entryId: page.cmsEntryId,
        locale,
        mode: "preview",
      });
      const content = extractWebsitePageContentFromCmsPayload(cmsPayload, page.template);
      const previewSeo = content.seoOverride ?? buildSeo(page);
      const publicMenus: PublicMenu[] = resolvedMenus.map((menu) => ({
        name: menu.name,
        locale: menu.locale,
        itemsJson: menu.itemsJson,
      }));

      return ok({
        siteId: site.id,
        siteSlug: site.slug,
        settings: resolvedSettings,
        page: {
          id: page.id,
          path: page.path,
          locale,
          templateKey: content.templateKey,
          content,
          seo: previewSeo,
        },
        pageId: page.id,
        path: page.path,
        locale,
        template: content.templateKey,
        payloadJson: content,
        seo: previewSeo,
        menus: publicMenus,
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
      settings?: unknown;
      menus?: unknown;
    };
    const content = normalizeWebsitePageContent(snapshotPayload?.content, page.template);
    const liveSeo = snapshotPayload?.seo ?? content.seoOverride ?? buildSeo(page);
    const snapshotMenus = toPublicMenus(snapshotPayload?.menus);
    const publicMenus =
      snapshotMenus.length > 0
        ? snapshotMenus
        : resolvedMenus.map((menu) => ({
            name: menu.name,
            locale: menu.locale,
            itemsJson: menu.itemsJson,
          }));
    const snapshotSettings = buildWebsiteSiteSettings({
      siteName: site.name,
      brandingJson:
        (snapshotPayload?.settings as { common?: unknown } | undefined)?.common ??
        site.brandingJson,
      themeJson:
        (snapshotPayload?.settings as { theme?: unknown } | undefined)?.theme ?? site.themeJson,
      custom:
        (snapshotPayload?.settings as { custom?: unknown } | undefined)?.custom ?? customSettings,
    });
    const liveSettings = await withResolvedSiteAssetUrls(
      snapshotSettings,
      this.deps.publicFileUrlPort
    );

    return ok({
      siteId: site.id,
      siteSlug: site.slug,
      settings: liveSettings,
      page: {
        id: page.id,
        path: page.path,
        locale,
        templateKey: content.templateKey,
        content,
        seo: liveSeo,
      },
      pageId: page.id,
      path: page.path,
      locale,
      template: content.templateKey,
      payloadJson: content,
      seo: liveSeo,
      menus: publicMenus,
      snapshotVersion: snapshot.version,
    });
  }
}
