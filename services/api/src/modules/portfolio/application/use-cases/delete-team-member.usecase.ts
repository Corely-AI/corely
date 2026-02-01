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
  TEAM_REPOSITORY_PORT,
  type TeamRepositoryPort,
} from "../ports/team-repository.port";
import { assertPortfolioWrite } from "../../policies/portfolio-policies";

@RequireTenant()
@Injectable()
export class DeleteTeamMemberUseCase extends BaseUseCase<{ memberId: string }, { deleted: true }> {
  constructor(@Inject(TEAM_REPOSITORY_PORT) private readonly repo: TeamRepositoryPort) {
    super({ logger: new NoopLogger() });
  }

  protected async handle(
    input: { memberId: string },
    ctx: UseCaseContext
  ): Promise<Result<{ deleted: true }, UseCaseError>> {
    assertPortfolioWrite(ctx);
    if (!ctx.workspaceId) {
      return err(new ValidationError("workspaceId is required"));
    }

    const existing = await this.repo.findById(ctx.tenantId!, ctx.workspaceId, input.memberId);
    if (!existing) {
      return err(new NotFoundError("Team member not found"));
    }

    await this.repo.delete(ctx.tenantId!, ctx.workspaceId, input.memberId);
    return ok({ deleted: true });
  }
}
