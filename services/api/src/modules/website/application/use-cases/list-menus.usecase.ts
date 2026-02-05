import {
  BaseUseCase,
  type LoggerPort,
  type Result,
  type UseCaseContext,
  type UseCaseError,
  ValidationError,
  ok,
  err,
  RequireTenant,
} from "@corely/kernel";
import type { ListWebsiteMenusOutput } from "@corely/contracts";
import type { WebsiteMenuRepositoryPort } from "../ports/menu-repository.port";

type Deps = {
  logger: LoggerPort;
  menuRepo: WebsiteMenuRepositoryPort;
};

@RequireTenant()
export class ListWebsiteMenusUseCase extends BaseUseCase<
  { siteId: string },
  ListWebsiteMenusOutput
> {
  constructor(private readonly deps: Deps) {
    super({ logger: deps.logger });
  }

  protected async handle(
    input: { siteId: string },
    ctx: UseCaseContext
  ): Promise<Result<ListWebsiteMenusOutput, UseCaseError>> {
    if (!ctx.tenantId) {
      return err(new ValidationError("tenantId is required", undefined, "Website:TenantRequired"));
    }

    const items = await this.deps.menuRepo.listBySite(ctx.tenantId, input.siteId);
    return ok({ items });
  }
}
