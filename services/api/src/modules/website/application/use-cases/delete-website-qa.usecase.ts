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
import type { WebsiteQaRepositoryPort } from "../ports/qa-repository.port";

type Deps = {
  logger: LoggerPort;
  qaRepo: WebsiteQaRepositoryPort;
};

@RequireTenant()
export class DeleteWebsiteQaUseCase extends BaseUseCase<
  { siteId: string; qaId: string },
  { success: true }
> {
  constructor(protected readonly deps: Deps) {
    super({ logger: deps.logger });
  }

  protected async handle(
    input: { siteId: string; qaId: string },
    ctx: UseCaseContext
  ): Promise<Result<{ success: true }, UseCaseError>> {
    if (!ctx.tenantId) {
      return err(new ValidationError("tenantId is required", undefined, "Website:TenantRequired"));
    }

    await this.deps.qaRepo.delete(ctx.tenantId, input.siteId, input.qaId);
    return ok({ success: true });
  }
}
