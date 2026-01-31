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
import type { PublicPortfolioShowcaseOutput } from "@corely/contracts";
import {
  SHOWCASE_REPOSITORY_PORT,
  type ShowcaseRepositoryPort,
} from "../ports/showcase-repository.port";
import {
  PROFILE_REPOSITORY_PORT,
  type ProfileRepositoryPort,
} from "../ports/profile-repository.port";
import {
  PROJECT_REPOSITORY_PORT,
  type ProjectRepositoryPort,
} from "../ports/project-repository.port";
import {
  CLIENT_REPOSITORY_PORT,
  type ClientRepositoryPort,
} from "../ports/client-repository.port";
import {
  SERVICE_REPOSITORY_PORT,
  type ServiceRepositoryPort,
} from "../ports/service-repository.port";
import {
  TEAM_REPOSITORY_PORT,
  type TeamRepositoryPort,
} from "../ports/team-repository.port";
import {
  toPortfolioShowcaseDto,
  toPortfolioProfileDto,
  toPortfolioProjectDto,
  toPortfolioClientDto,
  toPortfolioServiceDto,
  toPortfolioTeamMemberDto,
} from "../mappers/portfolio.mapper";

@RequireTenant()
@Injectable()
export class GetPublicShowcaseUseCase extends BaseUseCase<{ slug: string }, PublicPortfolioShowcaseOutput> {
  constructor(
    @Inject(SHOWCASE_REPOSITORY_PORT) private readonly showcaseRepo: ShowcaseRepositoryPort,
    @Inject(PROFILE_REPOSITORY_PORT) private readonly profileRepo: ProfileRepositoryPort,
    @Inject(PROJECT_REPOSITORY_PORT) private readonly projectRepo: ProjectRepositoryPort,
    @Inject(CLIENT_REPOSITORY_PORT) private readonly clientRepo: ClientRepositoryPort,
    @Inject(SERVICE_REPOSITORY_PORT) private readonly serviceRepo: ServiceRepositoryPort,
    @Inject(TEAM_REPOSITORY_PORT) private readonly teamRepo: TeamRepositoryPort
  ) {
    super({ logger: new NoopLogger() });
  }

  protected async handle(
    input: { slug: string },
    ctx: UseCaseContext
  ): Promise<Result<PublicPortfolioShowcaseOutput, UseCaseError>> {
    if (!ctx.workspaceId) {
      return err(new ValidationError("workspaceId is required"));
    }

    const showcase = await this.showcaseRepo.findBySlug(
      ctx.tenantId!,
      ctx.workspaceId,
      input.slug,
      { publishedOnly: true }
    );
    if (!showcase || !showcase.isPublished) {
      return err(new NotFoundError("Showcase not found"));
    }

    const profile = await this.profileRepo.findByShowcaseId(
      ctx.tenantId!,
      ctx.workspaceId,
      showcase.id
    );

    const featuredProjects = await this.projectRepo.listByShowcase(
      ctx.tenantId!,
      ctx.workspaceId,
      showcase.id,
      {
        featured: true,
        status: "published",
        publishedOnly: true,
      },
      { page: 1, pageSize: 50 }
    );

    const featuredClients = await this.clientRepo.listByShowcase(
      ctx.tenantId!,
      ctx.workspaceId,
      showcase.id,
      {
        featured: true,
        featuredOnly: true,
      },
      { page: 1, pageSize: 50 }
    );

    const featuredServices = await this.serviceRepo.listByShowcase(
      ctx.tenantId!,
      ctx.workspaceId,
      showcase.id,
      {
        status: "published",
        publishedOnly: true,
      },
      { page: 1, pageSize: 50 }
    );

    const featuredTeam = await this.teamRepo.listByShowcase(
      ctx.tenantId!,
      ctx.workspaceId,
      showcase.id,
      {
        status: "published",
        publishedOnly: true,
      },
      { page: 1, pageSize: 50 }
    );

    return ok({
      showcase: toPortfolioShowcaseDto(showcase),
      profile: profile && profile.isPublished ? toPortfolioProfileDto(profile) : null,
      featuredProjects: featuredProjects.items.map(toPortfolioProjectDto),
      featuredClients: featuredClients.items.map(toPortfolioClientDto),
      featuredServices: featuredServices.items.map(toPortfolioServiceDto),
      featuredTeamMembers: featuredTeam.items.map(toPortfolioTeamMemberDto),
    });
  }
}
