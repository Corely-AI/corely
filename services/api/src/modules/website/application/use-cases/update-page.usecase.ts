import {
  BaseUseCase,
  type LoggerPort,
  type Result,
  type UseCaseContext,
  type UseCaseError,
  ValidationError,
  NotFoundError,
  ConflictError,
  ok,
  err,
  RequireTenant,
} from "@corely/kernel";
import type { UpdateWebsitePageInput, WebsitePage } from "@corely/contracts";
import type { WebsitePageRepositoryPort } from "../ports/page-repository.port";
import type { CmsWritePort } from "../ports/cms-write.port";
import type { ClockPort } from "@shared/ports/clock.port";
import { normalizeLocale, normalizePath } from "../../domain/website.validators";
import { normalizeWebsitePageContent } from "../../domain/page-content";

type Deps = {
  logger: LoggerPort;
  pageRepo: WebsitePageRepositoryPort;
  cmsWrite: CmsWritePort;
  clock: ClockPort;
};

@RequireTenant()
export class UpdateWebsitePageUseCase extends BaseUseCase<
  { pageId: string; input: UpdateWebsitePageInput },
  WebsitePage
> {
  constructor(protected readonly deps: Deps) {
    super({ logger: deps.logger });
  }

  protected async handle(
    input: { pageId: string; input: UpdateWebsitePageInput },
    ctx: UseCaseContext
  ): Promise<Result<WebsitePage, UseCaseError>> {
    if (!ctx.tenantId) {
      return err(new ValidationError("tenantId is required", undefined, "Website:TenantRequired"));
    }

    const existing = await this.deps.pageRepo.findById(ctx.tenantId, input.pageId);
    if (!existing) {
      return err(new NotFoundError("Page not found", undefined, "Website:PageNotFound"));
    }

    const nextPath = input.input.path ? normalizePath(input.input.path) : existing.path;
    const nextLocale = input.input.locale ? normalizeLocale(input.input.locale) : existing.locale;

    if (nextPath !== existing.path || nextLocale !== existing.locale) {
      const conflict = await this.deps.pageRepo.findByPath(
        ctx.tenantId,
        existing.siteId,
        nextPath,
        nextLocale
      );
      if (conflict && conflict.id !== existing.id) {
        return err(
          new ConflictError("Page path already exists", undefined, "Website:PagePathTaken")
        );
      }
    }

    const now = this.deps.clock.now().toISOString();
    let updated: WebsitePage = {
      ...existing,
      path: nextPath,
      locale: nextLocale,
      template:
        input.input.templateKey?.trim() ?? input.input.template?.trim() ?? existing.template,
      cmsEntryId: input.input.cmsEntryId ?? existing.cmsEntryId,
      seoTitle: input.input.seoTitle === undefined ? existing.seoTitle : input.input.seoTitle,
      seoDescription:
        input.input.seoDescription === undefined
          ? existing.seoDescription
          : input.input.seoDescription,
      seoImageFileId:
        input.input.seoImageFileId === undefined
          ? existing.seoImageFileId
          : input.input.seoImageFileId,
      updatedAt: now,
    };

    updated = await this.deps.pageRepo.update(updated);

    if (input.input.content) {
      if (!ctx.workspaceId) {
        return err(
          new ValidationError(
            "workspaceId is required when setting page content",
            undefined,
            "Website:WorkspaceRequired"
          )
        );
      }

      const content = normalizeWebsitePageContent(input.input.content, updated.template);
      await this.deps.cmsWrite.updateDraftEntryContentJson({
        tenantId: ctx.tenantId,
        workspaceId: ctx.workspaceId,
        entryId: updated.cmsEntryId,
        contentJson: content,
      });

      if (updated.template !== content.templateKey) {
        updated = await this.deps.pageRepo.update({
          ...updated,
          template: content.templateKey,
          updatedAt: this.deps.clock.now().toISOString(),
        });
      }
    }

    return ok(updated);
  }
}
