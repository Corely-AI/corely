import { Module } from "@nestjs/common";
import { DataModule } from "@corely/data";
import { KernelModule } from "../../shared/kernel/kernel.module";
import { IdentityModule } from "../identity";
import { PlatformModule } from "../platform";
import { PortfolioShowcasesController } from "./http/portfolio-showcases.controller";
import { PortfolioProfileController } from "./http/portfolio-profile.controller";
import { PortfolioProjectsController } from "./http/portfolio-projects.controller";
import { PortfolioClientsController } from "./http/portfolio-clients.controller";
import { PortfolioServicesController } from "./http/portfolio-services.controller";
import { PortfolioTeamController } from "./http/portfolio-team.controller";
import { PortfolioPublicController } from "./http/portfolio-public.controller";
import { PortfolioPublicSiteController } from "./http/portfolio-public-site.controller";
import { PrismaShowcaseRepository } from "./infrastructure/prisma/prisma-showcase-repository.adapter";
import { PrismaProfileRepository } from "./infrastructure/prisma/prisma-profile-repository.adapter";
import { PrismaProjectRepository } from "./infrastructure/prisma/prisma-project-repository.adapter";
import { PrismaClientRepository } from "./infrastructure/prisma/prisma-client-repository.adapter";
import { PrismaServiceRepository } from "./infrastructure/prisma/prisma-service-repository.adapter";
import { PrismaTeamRepository } from "./infrastructure/prisma/prisma-team-repository.adapter";
import { PortfolioApplication } from "./application/portfolio.application";
import { CreateShowcaseUseCase } from "./application/use-cases/create-showcase.usecase";
import { UpdateShowcaseUseCase } from "./application/use-cases/update-showcase.usecase";
import { GetShowcaseUseCase } from "./application/use-cases/get-showcase.usecase";
import { ListShowcasesUseCase } from "./application/use-cases/list-showcases.usecase";
import { DeleteShowcaseUseCase } from "./application/use-cases/delete-showcase.usecase";
import { UpsertProfileUseCase } from "./application/use-cases/upsert-profile.usecase";
import { GetProfileUseCase } from "./application/use-cases/get-profile.usecase";
import { CreateProjectUseCase } from "./application/use-cases/create-project.usecase";
import { UpdateProjectUseCase } from "./application/use-cases/update-project.usecase";
import { GetProjectUseCase } from "./application/use-cases/get-project.usecase";
import { ListProjectsUseCase } from "./application/use-cases/list-projects.usecase";
import { DeleteProjectUseCase } from "./application/use-cases/delete-project.usecase";
import { SetProjectClientsUseCase } from "./application/use-cases/set-project-clients.usecase";
import { CreateClientUseCase } from "./application/use-cases/create-client.usecase";
import { UpdateClientUseCase } from "./application/use-cases/update-client.usecase";
import { GetClientUseCase } from "./application/use-cases/get-client.usecase";
import { ListClientsUseCase } from "./application/use-cases/list-clients.usecase";
import { DeleteClientUseCase } from "./application/use-cases/delete-client.usecase";
import { CreateServiceUseCase } from "./application/use-cases/create-service.usecase";
import { UpdateServiceUseCase } from "./application/use-cases/update-service.usecase";
import { GetServiceUseCase } from "./application/use-cases/get-service.usecase";
import { ListServicesUseCase } from "./application/use-cases/list-services.usecase";
import { DeleteServiceUseCase } from "./application/use-cases/delete-service.usecase";
import { CreateTeamMemberUseCase } from "./application/use-cases/create-team-member.usecase";
import { UpdateTeamMemberUseCase } from "./application/use-cases/update-team-member.usecase";
import { GetTeamMemberUseCase } from "./application/use-cases/get-team-member.usecase";
import { ListTeamMembersUseCase } from "./application/use-cases/list-team-members.usecase";
import { DeleteTeamMemberUseCase } from "./application/use-cases/delete-team-member.usecase";
import { GetPublicShowcaseUseCase } from "./application/use-cases/get-public-showcase.usecase";
import { ListPublicShowcasesUseCase } from "./application/use-cases/list-public-showcases.usecase";
import { ListPublicProjectsUseCase } from "./application/use-cases/list-public-projects.usecase";
import { GetPublicProjectUseCase } from "./application/use-cases/get-public-project.usecase";
import { ListPublicClientsUseCase } from "./application/use-cases/list-public-clients.usecase";
import { ListPublicServicesUseCase } from "./application/use-cases/list-public-services.usecase";
import { ListPublicTeamUseCase } from "./application/use-cases/list-public-team.usecase";
import { SHOWCASE_REPOSITORY_PORT } from "./application/ports/showcase-repository.port";
import { PROFILE_REPOSITORY_PORT } from "./application/ports/profile-repository.port";
import { PROJECT_REPOSITORY_PORT } from "./application/ports/project-repository.port";
import { CLIENT_REPOSITORY_PORT } from "./application/ports/client-repository.port";
import { SERVICE_REPOSITORY_PORT } from "./application/ports/service-repository.port";
import { TEAM_REPOSITORY_PORT } from "./application/ports/team-repository.port";

@Module({
  imports: [DataModule, KernelModule, IdentityModule, PlatformModule],
  controllers: [
    PortfolioShowcasesController,
    PortfolioProfileController,
    PortfolioProjectsController,
    PortfolioClientsController,
    PortfolioServicesController,
    PortfolioTeamController,
    PortfolioPublicController,
    PortfolioPublicSiteController,
  ],
  providers: [
    PrismaShowcaseRepository,
    { provide: SHOWCASE_REPOSITORY_PORT, useExisting: PrismaShowcaseRepository },
    PrismaProfileRepository,
    { provide: PROFILE_REPOSITORY_PORT, useExisting: PrismaProfileRepository },
    PrismaProjectRepository,
    { provide: PROJECT_REPOSITORY_PORT, useExisting: PrismaProjectRepository },
    PrismaClientRepository,
    { provide: CLIENT_REPOSITORY_PORT, useExisting: PrismaClientRepository },
    PrismaServiceRepository,
    { provide: SERVICE_REPOSITORY_PORT, useExisting: PrismaServiceRepository },
    PrismaTeamRepository,
    { provide: TEAM_REPOSITORY_PORT, useExisting: PrismaTeamRepository },

    CreateShowcaseUseCase,
    UpdateShowcaseUseCase,
    GetShowcaseUseCase,
    ListShowcasesUseCase,
    DeleteShowcaseUseCase,
    UpsertProfileUseCase,
    GetProfileUseCase,
    CreateProjectUseCase,
    UpdateProjectUseCase,
    GetProjectUseCase,
    ListProjectsUseCase,
    DeleteProjectUseCase,
    SetProjectClientsUseCase,
    CreateClientUseCase,
    UpdateClientUseCase,
    GetClientUseCase,
    ListClientsUseCase,
    DeleteClientUseCase,
    CreateServiceUseCase,
    UpdateServiceUseCase,
    GetServiceUseCase,
    ListServicesUseCase,
    DeleteServiceUseCase,
    CreateTeamMemberUseCase,
    UpdateTeamMemberUseCase,
    GetTeamMemberUseCase,
    ListTeamMembersUseCase,
    DeleteTeamMemberUseCase,
    GetPublicShowcaseUseCase,
    ListPublicShowcasesUseCase,
    ListPublicProjectsUseCase,
    GetPublicProjectUseCase,
    ListPublicClientsUseCase,
    ListPublicServicesUseCase,
    ListPublicTeamUseCase,
    {
      provide: PortfolioApplication,
      useFactory: (
        createShowcase: CreateShowcaseUseCase,
        updateShowcase: UpdateShowcaseUseCase,
        getShowcase: GetShowcaseUseCase,
        listShowcases: ListShowcasesUseCase,
        deleteShowcase: DeleteShowcaseUseCase,
        upsertProfile: UpsertProfileUseCase,
        getProfile: GetProfileUseCase,
        createProject: CreateProjectUseCase,
        updateProject: UpdateProjectUseCase,
        getProject: GetProjectUseCase,
        listProjects: ListProjectsUseCase,
        deleteProject: DeleteProjectUseCase,
        setProjectClients: SetProjectClientsUseCase,
        createClient: CreateClientUseCase,
        updateClient: UpdateClientUseCase,
        getClient: GetClientUseCase,
        listClients: ListClientsUseCase,
        deleteClient: DeleteClientUseCase,
        createService: CreateServiceUseCase,
        updateService: UpdateServiceUseCase,
        getService: GetServiceUseCase,
        listServices: ListServicesUseCase,
        deleteService: DeleteServiceUseCase,
        createTeamMember: CreateTeamMemberUseCase,
        updateTeamMember: UpdateTeamMemberUseCase,
        getTeamMember: GetTeamMemberUseCase,
        listTeamMembers: ListTeamMembersUseCase,
        deleteTeamMember: DeleteTeamMemberUseCase,
        getPublicShowcase: GetPublicShowcaseUseCase,
        listPublicShowcases: ListPublicShowcasesUseCase,
        listPublicProjects: ListPublicProjectsUseCase,
        getPublicProject: GetPublicProjectUseCase,
        listPublicClients: ListPublicClientsUseCase,
        listPublicServices: ListPublicServicesUseCase,
        listPublicTeam: ListPublicTeamUseCase
      ) =>
        new PortfolioApplication(
          createShowcase,
          updateShowcase,
          getShowcase,
          listShowcases,
          deleteShowcase,
          upsertProfile,
          getProfile,
          createProject,
          updateProject,
          getProject,
          listProjects,
          deleteProject,
          setProjectClients,
          createClient,
          updateClient,
          getClient,
          listClients,
          deleteClient,
          createService,
          updateService,
          getService,
          listServices,
          deleteService,
          createTeamMember,
          updateTeamMember,
          getTeamMember,
          listTeamMembers,
          deleteTeamMember,
          getPublicShowcase,
          listPublicShowcases,
          listPublicProjects,
          getPublicProject,
          listPublicClients,
          listPublicServices,
          listPublicTeam
        ),
      inject: [
        CreateShowcaseUseCase,
        UpdateShowcaseUseCase,
        GetShowcaseUseCase,
        ListShowcasesUseCase,
        DeleteShowcaseUseCase,
        UpsertProfileUseCase,
        GetProfileUseCase,
        CreateProjectUseCase,
        UpdateProjectUseCase,
        GetProjectUseCase,
        ListProjectsUseCase,
        DeleteProjectUseCase,
        SetProjectClientsUseCase,
        CreateClientUseCase,
        UpdateClientUseCase,
        GetClientUseCase,
        ListClientsUseCase,
        DeleteClientUseCase,
        CreateServiceUseCase,
        UpdateServiceUseCase,
        GetServiceUseCase,
        ListServicesUseCase,
        DeleteServiceUseCase,
        CreateTeamMemberUseCase,
        UpdateTeamMemberUseCase,
        GetTeamMemberUseCase,
        ListTeamMembersUseCase,
        DeleteTeamMemberUseCase,
        GetPublicShowcaseUseCase,
        ListPublicShowcasesUseCase,
        ListPublicProjectsUseCase,
        GetPublicProjectUseCase,
        ListPublicClientsUseCase,
        ListPublicServicesUseCase,
        ListPublicTeamUseCase,
      ],
    },
  ],
  exports: [PortfolioApplication],
})
export class PortfolioModule {}
