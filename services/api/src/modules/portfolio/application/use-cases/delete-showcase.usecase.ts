import { Injectable, Inject } from "@nestjs/common";
import {
  BaseUseCase,
  NoopLogger,
  type Result,
  type UseCaseContext,
  type UseCaseError,
  NotFoundError,
  ValidationError,
  RequireTenant,
  ok,
  err,
} from "@corely/kernel";
import {
  SHOWCASE_REPOSITORY_PORT,
  type ShowcaseRepositoryPort,
} from "../ports/showcase-repository.port";
import { assertPortfolioWrite } from "../../policies/portfolio-policies";

@RequireTenant()
@Injectable()
export class DeleteShowcaseUseCase extends BaseUseCase<{ showcaseId: string }, { deleted: true }> {
  constructor(@Inject(SHOWCASE_REPOSITORY_PORT) private readonly repo: ShowcaseRepositoryPort) {
    super({ logger: new NoopLogger() });
  }

  protected async handle(
    input: { showcaseId: string },
    ctx: UseCaseContext
  ): Promise<Result<{ deleted: true }, UseCaseError>> {
    assertPortfolioWrite(ctx);
    if (!ctx.workspaceId) {
      return err(new ValidationError("workspaceId is required"));
    }

    const existing = await this.repo.findById(ctx.tenantId!, ctx.workspaceId, input.showcaseId);
    if (!existing) {
      return err(new NotFoundError("Showcase not found"));
    }

    await this.repo.delete(ctx.tenantId!, ctx.workspaceId, input.showcaseId);
    return ok({ deleted: true });
  }
}
