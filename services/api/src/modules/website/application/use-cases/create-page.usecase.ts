import {
  BaseUseCase,
  type LoggerPort,
  type Result,
  type UseCaseContext,
  type UseCaseError,
  ValidationError,
  ConflictError,
  NotFoundError,
  ok,
  err,
  RequireTenant,
} from "@corely/kernel";
import type { CreateWebsitePageInput, WebsitePage } from "@corely/contracts";
import type { WebsitePageRepositoryPort } from "../ports/page-repository.port";
import type { WebsiteSiteRepositoryPort } from "../ports/site-repository.port";
import type { CmsWritePort } from "../ports/cms-write.port";
import type { IdGeneratorPort } from "@shared/ports/id-generator.port";
import type { ClockPort } from "@shared/ports/clock.port";
import { normalizeLocale, normalizePath } from "../../domain/website.validators";
import { normalizeWebsitePageContent } from "../../domain/page-content";

type Deps = {
  logger: LoggerPort;
  pageRepo: WebsitePageRepositoryPort;
  siteRepo: WebsiteSiteRepositoryPort;
  cmsWrite: CmsWritePort;
  idGenerator: IdGeneratorPort;
  clock: ClockPort;
};

@RequireTenant()
export class CreateWebsitePageUseCase extends BaseUseCase<CreateWebsitePageInput, WebsitePage> {
  constructor(protected readonly deps: Deps) {
    super({ logger: deps.logger });
  }

  protected validate(input: CreateWebsitePageInput): CreateWebsitePageInput {
    if (!input.siteId?.trim()) {
      throw new ValidationError("siteId is required", undefined, "Website:InvalidSite");
    }
    if (!input.path?.trim()) {
      throw new ValidationError("path is required", undefined, "Website:InvalidPath");
    }
    if (!input.locale?.trim()) {
      throw new ValidationError("locale is required", undefined, "Website:InvalidLocale");
    }
    if (!input.template?.trim() && !input.templateKey?.trim()) {
      throw new ValidationError(
        "template or templateKey is required",
        undefined,
        "Website:InvalidTemplate"
      );
    }
    if (!input.cmsEntryId?.trim()) {
      throw new ValidationError("cmsEntryId is required", undefined, "Website:InvalidCmsEntry");
    }
    return input;
  }

  protected async handle(
    input: CreateWebsitePageInput,
    ctx: UseCaseContext
  ): Promise<Result<WebsitePage, UseCaseError>> {
    if (!ctx.tenantId) {
      return err(new ValidationError("tenantId is required", undefined, "Website:TenantRequired"));
    }

    const site = await this.deps.siteRepo.findById(ctx.tenantId, input.siteId);
    if (!site) {
      return err(new NotFoundError("Site not found", undefined, "Website:SiteNotFound"));
    }

    const path = normalizePath(input.path);
    const locale = normalizeLocale(input.locale);

    const existing = await this.deps.pageRepo.findByPath(ctx.tenantId, input.siteId, path, locale);
    if (existing) {
      return err(new ConflictError("Page path already exists", undefined, "Website:PagePathTaken"));
    }

    const now = this.deps.clock.now().toISOString();
    const templateKey = (input.templateKey ?? input.template ?? "").trim();
    const page: WebsitePage = {
      id: this.deps.idGenerator.newId(),
      tenantId: ctx.tenantId,
      siteId: input.siteId,
      path,
      locale,
      template: templateKey,
      status: "DRAFT",
      cmsEntryId: input.cmsEntryId,
      seoTitle: input.seoTitle ?? null,
      seoDescription: input.seoDescription ?? null,
      seoImageFileId: input.seoImageFileId ?? null,
      publishedAt: null,
      createdAt: now,
      updatedAt: now,
    };

    let created = await this.deps.pageRepo.create(page);

    if (input.content) {
      if (!ctx.workspaceId) {
        return err(
          new ValidationError(
            "workspaceId is required when setting page content",
            undefined,
            "Website:WorkspaceRequired"
          )
        );
      }

      const content = normalizeWebsitePageContent(input.content, templateKey);
      await this.deps.cmsWrite.updateDraftEntryContentJson({
        tenantId: ctx.tenantId,
        workspaceId: ctx.workspaceId,
        entryId: created.cmsEntryId,
        contentJson: content,
      });

      if (created.template !== content.templateKey) {
        created = await this.deps.pageRepo.update({
          ...created,
          template: content.templateKey,
          updatedAt: this.deps.clock.now().toISOString(),
        });
      }
    }

    return ok(created);
  }
}
