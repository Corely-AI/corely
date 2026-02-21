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
import type { GetWebsitePageContentOutput } from "@corely/contracts";
import type { WebsitePageRepositoryPort } from "../ports/page-repository.port";
import type { CmsReadPort } from "../ports/cms-read.port";
import { normalizeWebsitePageContent } from "../../domain/page-content";

type Deps = {
  logger: LoggerPort;
  pageRepo: WebsitePageRepositoryPort;
  cmsRead: CmsReadPort;
};

@RequireTenant()
export class GetWebsitePageContentUseCase extends BaseUseCase<
  { pageId: string },
  GetWebsitePageContentOutput
> {
  constructor(protected readonly deps: Deps) {
    super({ logger: deps.logger });
  }

  protected async handle(
    input: { pageId: string },
    ctx: UseCaseContext
  ): Promise<Result<GetWebsitePageContentOutput, UseCaseError>> {
    if (!ctx.tenantId) {
      return err(new ValidationError("tenantId is required", undefined, "Website:TenantRequired"));
    }

    const page = await this.deps.pageRepo.findById(ctx.tenantId, input.pageId);
    if (!page) {
      return err(new NotFoundError("Page not found", undefined, "Website:PageNotFound"));
    }

    const contentJson = await this.deps.cmsRead.getEntryContentJson({
      tenantId: ctx.tenantId,
      entryId: page.cmsEntryId,
    });

    return ok({
      pageId: page.id,
      cmsEntryId: page.cmsEntryId,
      content: normalizeWebsitePageContent(contentJson, page.template),
    });
  }
}
