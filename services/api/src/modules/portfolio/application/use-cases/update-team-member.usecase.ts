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
import type { UpdatePortfolioTeamMemberInput, PortfolioTeamMember } from "@corely/contracts";
import type { PortfolioTeamMember as PortfolioTeamMemberEntity } from "../../domain/portfolio.types";
import { assertPublishableTeamMember, shouldPublish } from "../../domain/portfolio-rules";
import { TEAM_REPOSITORY_PORT, type TeamRepositoryPort } from "../ports/team-repository.port";
import { toPortfolioTeamMemberDto } from "../mappers/portfolio.mapper";
import { assertPortfolioWrite } from "../../policies/portfolio-policies";

type UpdateTeamParams = UpdatePortfolioTeamMemberInput & { memberId: string };

@RequireTenant()
@Injectable()
export class UpdateTeamMemberUseCase extends BaseUseCase<UpdateTeamParams, PortfolioTeamMember> {
  constructor(@Inject(TEAM_REPOSITORY_PORT) private readonly repo: TeamRepositoryPort) {
    super({ logger: new NoopLogger() });
  }

  protected async handle(
    input: UpdateTeamParams,
    ctx: UseCaseContext
  ): Promise<Result<PortfolioTeamMember, UseCaseError>> {
    assertPortfolioWrite(ctx);
    if (!ctx.workspaceId) {
      return err(new ValidationError("workspaceId is required"));
    }

    const existing = await this.repo.findById(ctx.tenantId!, ctx.workspaceId, input.memberId);
    if (!existing) {
      return err(new NotFoundError("Team member not found"));
    }

    const nextStatus = input.status ?? existing.status;
    if (shouldPublish(nextStatus)) {
      const merged: Partial<PortfolioTeamMemberEntity> = {
        name: input.name ?? existing.name,
        roleTitle: input.roleTitle ?? existing.roleTitle,
        bio: input.bio ?? existing.bio,
      };
      assertPublishableTeamMember(merged);
    }

    const updated = await this.repo.update(ctx.tenantId!, ctx.workspaceId, existing.id, {
      name: input.name?.trim(),
      roleTitle: input.roleTitle?.trim(),
      bio: input.bio,
      skills: input.skills ?? undefined,
      photoUrl: input.photoUrl ?? undefined,
      socialLinks: input.socialLinks ?? undefined,
      status: input.status,
      sortOrder: input.sortOrder ?? undefined,
    });

    return ok(toPortfolioTeamMemberDto(updated));
  }
}
