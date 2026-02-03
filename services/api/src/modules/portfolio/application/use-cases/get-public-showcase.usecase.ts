import { Inject } from "@nestjs/common";
import {
  BaseUseCase,
  NoopLogger,
  type Result,
  type UseCaseContext,
  type UseCaseError,
  NotFoundError,
  ValidationError,
  ok,
  err,
} from "@corely/kernel";
import type { PublicPortfolioShowcaseOutput } from "@corely/contracts";
import { assertPublicModuleEnabled, getPublicWorkspaceMetadata } from "../../../../shared/public";
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
import { CLIENT_REPOSITORY_PORT, type ClientRepositoryPort } from "../ports/client-repository.port";
import {
  SERVICE_REPOSITORY_PORT,
  type ServiceRepositoryPort,
} from "../ports/service-repository.port";
import { TEAM_REPOSITORY_PORT, type TeamRepositoryPort } from "../ports/team-repository.port";
import {
  toPortfolioShowcaseDto,
  toPortfolioProfileDto,
  toPortfolioProjectDto,
  toPortfolioClientDto,
  toPortfolioServiceDto,
  toPortfolioTeamMemberDto,
} from "../mappers/portfolio.mapper";

export class GetPublicShowcaseUseCase extends BaseUseCase<
  { slug?: string; domain?: string },
  PublicPortfolioShowcaseOutput
> {
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
    input: { slug?: string; domain?: string },
    ctx: UseCaseContext
  ): Promise<Result<PublicPortfolioShowcaseOutput, UseCaseError>> {
    if (getPublicWorkspaceMetadata(ctx)) {
      const publishError = assertPublicModuleEnabled(ctx, "portfolio");
      if (publishError) {
        return err(publishError);
      }
    }

    if (!input.slug && !input.domain) {
      return err(new ValidationError("Either slug or domain is required"));
    }

    let showcase;
    if (input.domain) {
      showcase = await this.showcaseRepo.findByDomain(input.domain, { publishedOnly: true });
    } else {
      showcase = await this.showcaseRepo.findBySlug(input.slug ?? "", {
        publishedOnly: true,
        tenantId: ctx.tenantId,
        workspaceId: ctx.workspaceId,
        // For safety, let's allow finding by slug globally if no tenant provided.
      });
    }
    if (!showcase || !showcase.isPublished) {
      return err(new NotFoundError("Showcase not found"));
    }

    const profile = await this.profileRepo.findByShowcaseId(
      showcase.tenantId,
      showcase.workspaceId,
      showcase.id
    );

    const featuredProjects = await this.projectRepo.listByShowcase(
      showcase.tenantId,
      showcase.workspaceId,
      showcase.id,
      {
        featured: true,
        status: "published",
        publishedOnly: true,
      },
      { page: 1, pageSize: 50 }
    );

    const featuredClients = await this.clientRepo.listByShowcase(
      showcase.tenantId,
      showcase.workspaceId,
      showcase.id,
      {
        featured: true,
        featuredOnly: true,
      },
      { page: 1, pageSize: 50 }
    );

    const featuredServices = await this.serviceRepo.listByShowcase(
      showcase.tenantId,
      showcase.workspaceId,
      showcase.id,
      {
        status: "published",
        publishedOnly: true,
      },
      { page: 1, pageSize: 50 }
    );

    const featuredTeam = await this.teamRepo.listByShowcase(
      showcase.tenantId,
      showcase.workspaceId,
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
