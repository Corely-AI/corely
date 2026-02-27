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
} from "@corely/kernel";
import type {
  UpdateWebsitePageContentInput,
  UpdateWebsitePageContentOutput,
  WebsitePage,
} from "@corely/contracts";
import type { WebsitePageRepositoryPort } from "../ports/page-repository.port";
import type { CmsWritePort } from "../ports/cms-write.port";
import type { ClockPort } from "@shared/ports/clock.port";
import { normalizeWebsitePageContent } from "../../domain/page-content";

type Deps = {
  logger: LoggerPort;
  pageRepo: WebsitePageRepositoryPort;
  cmsWrite: CmsWritePort;
  clock: ClockPort;
};

@RequireTenant()
export class UpdateWebsitePageContentUseCase extends BaseUseCase<
  { pageId: string; input: UpdateWebsitePageContentInput },
  UpdateWebsitePageContentOutput
> {
  constructor(protected readonly deps: Deps) {
    super({ logger: deps.logger });
  }

  protected async handle(
    input: { pageId: string; input: UpdateWebsitePageContentInput },
    ctx: UseCaseContext
  ): Promise<Result<UpdateWebsitePageContentOutput, UseCaseError>> {
    if (!ctx.tenantId) {
      return err(new ValidationError("tenantId is required", undefined, "Website:TenantRequired"));
    }

    if (!ctx.workspaceId) {
      return err(
        new ValidationError("workspaceId is required", undefined, "Website:WorkspaceRequired")
      );
    }

    const page = await this.deps.pageRepo.findById(ctx.tenantId, input.pageId);
    if (!page) {
      return err(new NotFoundError("Page not found", undefined, "Website:PageNotFound"));
    }

    const content = normalizeWebsitePageContent(input.input, page.template);

    await this.deps.cmsWrite.updateDraftEntryContentJson({
      tenantId: ctx.tenantId,
      workspaceId: ctx.workspaceId,
      entryId: page.cmsEntryId,
      contentJson: content,
    });

    let nextPage: WebsitePage = page;
    if (page.template !== content.templateKey) {
      nextPage = await this.deps.pageRepo.update(
        {
          ...page,
          template: content.templateKey,
          updatedAt: this.deps.clock.now().toISOString(),
        },
        undefined
      );
    }

    return ok({
      pageId: nextPage.id,
      cmsEntryId: nextPage.cmsEntryId,
      content,
    });
  }
}
