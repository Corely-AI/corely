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
import type { GetWebsitePageOutput } from "@corely/contracts";
import type { WebsitePageRepositoryPort } from "../ports/page-repository.port";

type Deps = {
  logger: LoggerPort;
  pageRepo: WebsitePageRepositoryPort;
};

@RequireTenant()
export class GetWebsitePageUseCase extends BaseUseCase<{ pageId: string }, GetWebsitePageOutput> {
  constructor(protected readonly deps: Deps) {
    super({ logger: deps.logger });
  }

  protected async handle(
    input: { pageId: string },
    ctx: UseCaseContext
  ): Promise<Result<GetWebsitePageOutput, UseCaseError>> {
    if (!ctx.tenantId) {
      return err(new ValidationError("tenantId is required", undefined, "Website:TenantRequired"));
    }

    const page = await this.deps.pageRepo.findById(ctx.tenantId, input.pageId);
    if (!page) {
      return err(new NotFoundError("Page not found", undefined, "Website:PageNotFound"));
    }

    return ok({ page });
  }
}
