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
import type { GetPortfolioTeamMemberOutput } from "@corely/contracts";
import { TEAM_REPOSITORY_PORT, type TeamRepositoryPort } from "../ports/team-repository.port";
import { toPortfolioTeamMemberDto } from "../mappers/portfolio.mapper";
import { assertPortfolioRead } from "../../policies/portfolio-policies";

@RequireTenant()
@Injectable()
export class GetTeamMemberUseCase extends BaseUseCase<
  { memberId: string },
  GetPortfolioTeamMemberOutput
> {
  constructor(@Inject(TEAM_REPOSITORY_PORT) private readonly repo: TeamRepositoryPort) {
    super({ logger: new NoopLogger() });
  }

  protected async handle(
    input: { memberId: string },
    ctx: UseCaseContext
  ): Promise<Result<GetPortfolioTeamMemberOutput, UseCaseError>> {
    assertPortfolioRead(ctx);
    if (!ctx.workspaceId) {
      return err(new ValidationError("workspaceId is required"));
    }

    const member = await this.repo.findById(ctx.tenantId!, ctx.workspaceId, input.memberId);
    if (!member) {
      return err(new NotFoundError("Team member not found"));
    }

    return ok({ teamMember: toPortfolioTeamMemberDto(member) });
  }
}
