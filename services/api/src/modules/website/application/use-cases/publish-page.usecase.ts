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
  RequireTenant,
  type OutboxPort,
  type UnitOfWorkPort,
} from "@corely/kernel";
import type { PublishWebsitePageOutput, WebsitePage, WebsitePageSnapshot } from "@corely/contracts";
import type { WebsitePageRepositoryPort } from "../ports/page-repository.port";
import type { WebsiteSnapshotRepositoryPort } from "../ports/snapshot-repository.port";
import type { CmsReadPort } from "../ports/cms-read.port";
import type { WebsiteSiteRepositoryPort } from "../ports/site-repository.port";
import type { WebsiteMenuRepositoryPort } from "../ports/menu-repository.port";
import type { WebsiteCustomAttributesPort } from "../ports/custom-attributes.port";
import type { IdGeneratorPort } from "@shared/ports/id-generator.port";
import type { ClockPort } from "@shared/ports/clock.port";
import { buildSeo } from "../../domain/website.validators";
import {
  buildWebsiteSiteSettings,
  WEBSITE_SITE_SETTINGS_ENTITY_TYPE,
} from "../../domain/site-settings";
import { extractWebsitePageContentFromCmsPayload } from "../../domain/page-content";

type Deps = {
  logger: LoggerPort;
  pageRepo: WebsitePageRepositoryPort;
  snapshotRepo: WebsiteSnapshotRepositoryPort;
  cmsRead: CmsReadPort;
  siteRepo: WebsiteSiteRepositoryPort;
  menuRepo: WebsiteMenuRepositoryPort;
  customAttributes: WebsiteCustomAttributesPort;
  outbox: OutboxPort;
  uow: UnitOfWorkPort;
  idGenerator: IdGeneratorPort;
  clock: ClockPort;
};

@RequireTenant()
export class PublishWebsitePageUseCase extends BaseUseCase<
  { pageId: string },
  PublishWebsitePageOutput
> {
  constructor(protected readonly deps: Deps) {
    super({ logger: deps.logger });
  }

  protected async handle(
    input: { pageId: string },
    ctx: UseCaseContext
  ): Promise<Result<PublishWebsitePageOutput, UseCaseError>> {
    if (!ctx.tenantId) {
      return err(new ValidationError("tenantId is required", undefined, "Website:TenantRequired"));
    }

    const page = await this.deps.pageRepo.findById(ctx.tenantId, input.pageId);
    if (!page) {
      return err(new NotFoundError("Page not found", undefined, "Website:PageNotFound"));
    }

    const site = await this.deps.siteRepo.findById(ctx.tenantId, page.siteId);
    if (!site) {
      return err(new NotFoundError("Site not found", undefined, "Website:SiteNotFound"));
    }

    const cmsPayload = await this.deps.cmsRead.getEntryForWebsiteRender({
      tenantId: ctx.tenantId,
      entryId: page.cmsEntryId,
      locale: page.locale,
      mode: "preview",
    });
    const content = extractWebsitePageContentFromCmsPayload(cmsPayload, page.template);

    const customSettings = await this.deps.customAttributes.getAttributes({
      tenantId: ctx.tenantId,
      entityType: WEBSITE_SITE_SETTINGS_ENTITY_TYPE,
      entityId: site.id,
    });
    const settings = buildWebsiteSiteSettings({
      siteName: site.name,
      brandingJson: site.brandingJson,
      themeJson: site.themeJson,
      custom: customSettings,
    });

    const menus = await this.deps.menuRepo.listBySite(ctx.tenantId, site.id);

    const snapshotPayload = {
      template: page.template,
      seo: buildSeo(page),
      content,
      settings,
      menus: menus.map((menu) => ({
        name: menu.name,
        locale: menu.locale,
        itemsJson: menu.itemsJson,
      })),
    };

    const now = this.deps.clock.now().toISOString();

    return this.deps.uow.withinTransaction(async (tx) => {
      const latestVersion = await this.deps.snapshotRepo.getLatestVersion(
        ctx.tenantId!,
        page.id,
        tx
      );
      const version = latestVersion ? latestVersion + 1 : 1;

      const snapshot: WebsitePageSnapshot = {
        id: this.deps.idGenerator.newId(),
        tenantId: ctx.tenantId!,
        siteId: page.siteId,
        pageId: page.id,
        path: page.path,
        locale: page.locale,
        version,
        payloadJson: snapshotPayload,
        createdAt: now,
      };

      const createdSnapshot = await this.deps.snapshotRepo.create(snapshot, tx);

      const updatedPage: WebsitePage = {
        ...page,
        status: "PUBLISHED",
        publishedAt: now,
        updatedAt: now,
      };

      const savedPage = await this.deps.pageRepo.update(updatedPage, tx);

      await this.deps.outbox.enqueue(
        {
          tenantId: ctx.tenantId!,
          eventType: "website.page.published",
          payload: {
            tenantId: ctx.tenantId!,
            siteId: page.siteId,
            pageId: page.id,
            path: page.path,
            locale: page.locale,
            cmsEntryId: page.cmsEntryId,
            template: content.templateKey,
            snapshotId: createdSnapshot.id,
            version,
            publishedAt: now,
          },
          correlationId: ctx.correlationId,
        },
        tx
      );

      return ok({ page: savedPage, snapshot: createdSnapshot });
    });
  }
}
