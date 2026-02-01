import { Injectable, Inject } from "@nestjs/common";
import {
  BaseUseCase,
  NoopLogger,
  type Result,
  type UseCaseContext,
  type UseCaseError,
  ValidationError,
  NotFoundError,
  RequireTenant,
  ok,
  err,
} from "@corely/kernel";
import type { CreatePortfolioTeamMemberInput, PortfolioTeamMember } from "@corely/contracts";
import {
  assertCompanyMode,
  assertPublishableTeamMember,
  shouldPublish,
} from "../../domain/portfolio-rules";
import { TEAM_REPOSITORY_PORT, type TeamRepositoryPort } from "../ports/team-repository.port";
import {
  SHOWCASE_REPOSITORY_PORT,
  type ShowcaseRepositoryPort,
} from "../ports/showcase-repository.port";
import { toPortfolioTeamMemberDto } from "../mappers/portfolio.mapper";
import { assertPortfolioWrite } from "../../policies/portfolio-policies";
import type { PortfolioTeamMember as PortfolioTeamMemberEntity } from "../../domain/portfolio.types";

type CreateTeamParams = CreatePortfolioTeamMemberInput & { showcaseId: string };

@RequireTenant()
@Injectable()
export class CreateTeamMemberUseCase extends BaseUseCase<CreateTeamParams, PortfolioTeamMember> {
  constructor(
    @Inject(TEAM_REPOSITORY_PORT) private readonly repo: TeamRepositoryPort,
    @Inject(SHOWCASE_REPOSITORY_PORT) private readonly showcaseRepo: ShowcaseRepositoryPort
  ) {
    super({ logger: new NoopLogger() });
  }

  protected async handle(
    input: CreateTeamParams,
    ctx: UseCaseContext
  ): Promise<Result<PortfolioTeamMember, UseCaseError>> {
    assertPortfolioWrite(ctx);
    if (!ctx.workspaceId) {
      return err(new ValidationError("workspaceId is required"));
    }

    const showcase = await this.showcaseRepo.findById(
      ctx.tenantId!,
      ctx.workspaceId,
      input.showcaseId
    );
    if (!showcase) {
      return err(new NotFoundError("Showcase not found"));
    }

    assertCompanyMode(showcase.type);

    const status = input.status ?? "draft";
    if (shouldPublish(status)) {
      const merged: Partial<PortfolioTeamMemberEntity> = {
        name: input.name,
        roleTitle: input.roleTitle,
        bio: input.bio,
      };
      assertPublishableTeamMember(merged);
    }

    const created = await this.repo.create({
      tenantId: ctx.tenantId!,
      workspaceId: ctx.workspaceId,
      showcaseId: input.showcaseId,
      name: input.name.trim(),
      roleTitle: input.roleTitle.trim(),
      bio: input.bio,
      skills: input.skills ?? [],
      photoUrl: input.photoUrl ?? null,
      socialLinks: input.socialLinks ?? null,
      status,
      sortOrder: input.sortOrder ?? null,
    });

    return ok(toPortfolioTeamMemberDto(created));
  }
}
