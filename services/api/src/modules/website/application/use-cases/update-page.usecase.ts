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
import type { ClockPort } from "@shared/ports/clock.port";
import { normalizeLocale, normalizePath } from "../../domain/website.validators";

type Deps = {
  logger: LoggerPort;
  pageRepo: WebsitePageRepositoryPort;
  clock: ClockPort;
};

@RequireTenant()
export class UpdateWebsitePageUseCase extends BaseUseCase<
  { pageId: string; input: UpdateWebsitePageInput },
  WebsitePage
> {
  constructor(private readonly deps: Deps) {
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
    const updated: WebsitePage = {
      ...existing,
      path: nextPath,
      locale: nextLocale,
      template: input.input.template?.trim() ?? existing.template,
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

    const saved = await this.deps.pageRepo.update(updated);
    return ok(saved);
  }
}
