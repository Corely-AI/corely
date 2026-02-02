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
import type { PortfolioShowcase } from "@corely/contracts";
import {
  SHOWCASE_REPOSITORY_PORT,
  type ShowcaseRepositoryPort,
} from "../ports/showcase-repository.port";
import { toPortfolioShowcaseDto } from "../mappers/portfolio.mapper";
import { assertPortfolioRead } from "../../policies/portfolio-policies";

@RequireTenant()
@Injectable()
export class GetShowcaseUseCase extends BaseUseCase<{ showcaseId: string }, PortfolioShowcase> {
  constructor(@Inject(SHOWCASE_REPOSITORY_PORT) private readonly repo: ShowcaseRepositoryPort) {
    super({ logger: new NoopLogger() });
  }

  protected async handle(
    input: { showcaseId: string },
    ctx: UseCaseContext
  ): Promise<Result<PortfolioShowcase, UseCaseError>> {
    assertPortfolioRead(ctx);
    if (!ctx.workspaceId) {
      return err(new ValidationError("workspaceId is required"));
    }

    const showcase = await this.repo.findById(ctx.tenantId!, ctx.workspaceId, input.showcaseId);
    if (!showcase) {
      return err(new NotFoundError("Showcase not found"));
    }

    return ok(toPortfolioShowcaseDto(showcase));
  }
}
