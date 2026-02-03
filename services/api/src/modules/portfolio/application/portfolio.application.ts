import type { CreateShowcaseUseCase } from "./use-cases/create-showcase.usecase";
import type { UpdateShowcaseUseCase } from "./use-cases/update-showcase.usecase";
import type { GetShowcaseUseCase } from "./use-cases/get-showcase.usecase";
import type { ListShowcasesUseCase } from "./use-cases/list-showcases.usecase";
import type { DeleteShowcaseUseCase } from "./use-cases/delete-showcase.usecase";
import type { UpsertProfileUseCase } from "./use-cases/upsert-profile.usecase";
import type { GetProfileUseCase } from "./use-cases/get-profile.usecase";
import type { CreateProjectUseCase } from "./use-cases/create-project.usecase";
import type { UpdateProjectUseCase } from "./use-cases/update-project.usecase";
import type { GetProjectUseCase } from "./use-cases/get-project.usecase";
import type { ListProjectsUseCase } from "./use-cases/list-projects.usecase";
import type { DeleteProjectUseCase } from "./use-cases/delete-project.usecase";
import type { SetProjectClientsUseCase } from "./use-cases/set-project-clients.usecase";
import type { CreateClientUseCase } from "./use-cases/create-client.usecase";
import type { UpdateClientUseCase } from "./use-cases/update-client.usecase";
import type { GetClientUseCase } from "./use-cases/get-client.usecase";
import type { ListClientsUseCase } from "./use-cases/list-clients.usecase";
import type { DeleteClientUseCase } from "./use-cases/delete-client.usecase";
import type { CreateServiceUseCase } from "./use-cases/create-service.usecase";
import type { UpdateServiceUseCase } from "./use-cases/update-service.usecase";
import type { GetServiceUseCase } from "./use-cases/get-service.usecase";
import type { ListServicesUseCase } from "./use-cases/list-services.usecase";
import type { DeleteServiceUseCase } from "./use-cases/delete-service.usecase";
import type { CreateTeamMemberUseCase } from "./use-cases/create-team-member.usecase";
import type { UpdateTeamMemberUseCase } from "./use-cases/update-team-member.usecase";
import type { GetTeamMemberUseCase } from "./use-cases/get-team-member.usecase";
import type { ListTeamMembersUseCase } from "./use-cases/list-team-members.usecase";
import type { DeleteTeamMemberUseCase } from "./use-cases/delete-team-member.usecase";
import type { GetPublicShowcaseUseCase } from "./use-cases/get-public-showcase.usecase";
import type { ListPublicShowcasesUseCase } from "./use-cases/list-public-showcases.usecase";
import type { ListPublicProjectsUseCase } from "./use-cases/list-public-projects.usecase";
import type { GetPublicProjectUseCase } from "./use-cases/get-public-project.usecase";
import type { ListPublicClientsUseCase } from "./use-cases/list-public-clients.usecase";
import type { ListPublicServicesUseCase } from "./use-cases/list-public-services.usecase";
import type { ListPublicTeamUseCase } from "./use-cases/list-public-team.usecase";

export class PortfolioApplication {
  constructor(
    public readonly createShowcase: CreateShowcaseUseCase,
    public readonly updateShowcase: UpdateShowcaseUseCase,
    public readonly getShowcase: GetShowcaseUseCase,
    public readonly listShowcases: ListShowcasesUseCase,
    public readonly deleteShowcase: DeleteShowcaseUseCase,
    public readonly upsertProfile: UpsertProfileUseCase,
    public readonly getProfile: GetProfileUseCase,
    public readonly createProject: CreateProjectUseCase,
    public readonly updateProject: UpdateProjectUseCase,
    public readonly getProject: GetProjectUseCase,
    public readonly listProjects: ListProjectsUseCase,
    public readonly deleteProject: DeleteProjectUseCase,
    public readonly setProjectClients: SetProjectClientsUseCase,
    public readonly createClient: CreateClientUseCase,
    public readonly updateClient: UpdateClientUseCase,
    public readonly getClient: GetClientUseCase,
    public readonly listClients: ListClientsUseCase,
    public readonly deleteClient: DeleteClientUseCase,
    public readonly createService: CreateServiceUseCase,
    public readonly updateService: UpdateServiceUseCase,
    public readonly getService: GetServiceUseCase,
    public readonly listServices: ListServicesUseCase,
    public readonly deleteService: DeleteServiceUseCase,
    public readonly createTeamMember: CreateTeamMemberUseCase,
    public readonly updateTeamMember: UpdateTeamMemberUseCase,
    public readonly getTeamMember: GetTeamMemberUseCase,
    public readonly listTeamMembers: ListTeamMembersUseCase,
    public readonly deleteTeamMember: DeleteTeamMemberUseCase,
    public readonly getPublicShowcase: GetPublicShowcaseUseCase,
    public readonly listPublicShowcases: ListPublicShowcasesUseCase,
    public readonly listPublicProjects: ListPublicProjectsUseCase,
    public readonly getPublicProject: GetPublicProjectUseCase,
    public readonly listPublicClients: ListPublicClientsUseCase,
    public readonly listPublicServices: ListPublicServicesUseCase,
    public readonly listPublicTeam: ListPublicTeamUseCase
  ) {}
}
