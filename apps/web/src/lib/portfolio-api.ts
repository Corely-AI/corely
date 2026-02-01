import type {
  CreatePortfolioClientInput,
  CreatePortfolioProjectInput,
  CreatePortfolioServiceInput,
  CreatePortfolioShowcaseInput,
  CreatePortfolioTeamMemberInput,
  GetPortfolioClientOutput,
  GetPortfolioProfileOutput,
  GetPortfolioProjectOutput,
  GetPortfolioServiceOutput,
  GetPortfolioShowcaseOutput,
  GetPortfolioTeamMemberOutput,
  ListPortfolioClientsInput,
  ListPortfolioClientsOutput,
  ListPortfolioProjectsInput,
  ListPortfolioProjectsOutput,
  ListPortfolioServicesInput,
  ListPortfolioServicesOutput,
  ListPortfolioShowcasesInput,
  ListPortfolioShowcasesOutput,
  ListPortfolioTeamMembersInput,
  ListPortfolioTeamMembersOutput,
  PortfolioClient,
  PortfolioProject,
  PortfolioService,
  PortfolioShowcase,
  PortfolioTeamMember,
  SetProjectClientsInput,
  UpdatePortfolioClientInput,
  UpdatePortfolioProjectInput,
  UpdatePortfolioServiceInput,
  UpdatePortfolioShowcaseInput,
  UpdatePortfolioTeamMemberInput,
  UpsertPortfolioProfileInput,
} from "@corely/contracts";
import { apiClient } from "./api-client";
import { buildListQuery } from "./api-query-utils";

export class PortfolioApi {
  async listShowcases(
    params: ListPortfolioShowcasesInput = {}
  ): Promise<ListPortfolioShowcasesOutput> {
    const query = buildListQuery(params);
    const endpoint = query.toString()
      ? `/portfolio/showcases?${query.toString()}`
      : "/portfolio/showcases";
    return apiClient.get<ListPortfolioShowcasesOutput>(endpoint, {
      correlationId: apiClient.generateCorrelationId(),
    });
  }

  async createShowcase(input: CreatePortfolioShowcaseInput): Promise<PortfolioShowcase> {
    const result = await apiClient.post<GetPortfolioShowcaseOutput>("/portfolio/showcases", input, {
      idempotencyKey: apiClient.generateIdempotencyKey(),
      correlationId: apiClient.generateCorrelationId(),
    });
    return result.showcase;
  }

  async getShowcase(id: string): Promise<PortfolioShowcase> {
    const result = await apiClient.get<GetPortfolioShowcaseOutput>(`/portfolio/showcases/${id}`, {
      correlationId: apiClient.generateCorrelationId(),
    });
    return result.showcase;
  }

  async updateShowcase(
    id: string,
    input: UpdatePortfolioShowcaseInput
  ): Promise<PortfolioShowcase> {
    const result = await apiClient.patch<GetPortfolioShowcaseOutput>(
      `/portfolio/showcases/${id}`,
      input,
      {
        correlationId: apiClient.generateCorrelationId(),
      }
    );
    return result.showcase;
  }

  async deleteShowcase(id: string): Promise<void> {
    await apiClient.delete(`/portfolio/showcases/${id}`, {
      correlationId: apiClient.generateCorrelationId(),
    });
  }

  async getProfile(showcaseId: string): Promise<GetPortfolioProfileOutput["profile"]> {
    const result = await apiClient.get<GetPortfolioProfileOutput>(
      `/portfolio/showcases/${showcaseId}/profile`,
      { correlationId: apiClient.generateCorrelationId() }
    );
    return result.profile;
  }

  async upsertProfile(showcaseId: string, input: UpsertPortfolioProfileInput) {
    const result = await apiClient.put<GetPortfolioProfileOutput>(
      `/portfolio/showcases/${showcaseId}/profile`,
      input,
      { correlationId: apiClient.generateCorrelationId() }
    );
    return result.profile;
  }

  async listProjects(
    showcaseId: string,
    params: ListPortfolioProjectsInput = {}
  ): Promise<ListPortfolioProjectsOutput> {
    const query = buildListQuery(params);
    const endpoint = query.toString()
      ? `/portfolio/showcases/${showcaseId}/projects?${query.toString()}`
      : `/portfolio/showcases/${showcaseId}/projects`;
    return apiClient.get<ListPortfolioProjectsOutput>(endpoint, {
      correlationId: apiClient.generateCorrelationId(),
    });
  }

  async createProject(
    showcaseId: string,
    input: CreatePortfolioProjectInput
  ): Promise<PortfolioProject> {
    const result = await apiClient.post<GetPortfolioProjectOutput>(
      `/portfolio/showcases/${showcaseId}/projects`,
      input,
      {
        idempotencyKey: apiClient.generateIdempotencyKey(),
        correlationId: apiClient.generateCorrelationId(),
      }
    );
    return result.project;
  }

  async getProject(id: string): Promise<GetPortfolioProjectOutput> {
    return apiClient.get<GetPortfolioProjectOutput>(`/portfolio/projects/${id}`, {
      correlationId: apiClient.generateCorrelationId(),
    });
  }

  async updateProject(id: string, input: UpdatePortfolioProjectInput): Promise<PortfolioProject> {
    const result = await apiClient.patch<GetPortfolioProjectOutput>(
      `/portfolio/projects/${id}`,
      input,
      {
        correlationId: apiClient.generateCorrelationId(),
      }
    );
    return result.project;
  }

  async deleteProject(id: string): Promise<void> {
    await apiClient.delete(`/portfolio/projects/${id}`, {
      correlationId: apiClient.generateCorrelationId(),
    });
  }

  async setProjectClients(id: string, input: SetProjectClientsInput): Promise<void> {
    await apiClient.put(`/portfolio/projects/${id}/clients`, input, {
      correlationId: apiClient.generateCorrelationId(),
    });
  }

  async listClients(
    showcaseId: string,
    params: ListPortfolioClientsInput = {}
  ): Promise<ListPortfolioClientsOutput> {
    const query = buildListQuery(params);
    const endpoint = query.toString()
      ? `/portfolio/showcases/${showcaseId}/clients?${query.toString()}`
      : `/portfolio/showcases/${showcaseId}/clients`;
    return apiClient.get<ListPortfolioClientsOutput>(endpoint, {
      correlationId: apiClient.generateCorrelationId(),
    });
  }

  async createClient(
    showcaseId: string,
    input: CreatePortfolioClientInput
  ): Promise<PortfolioClient> {
    const result = await apiClient.post<GetPortfolioClientOutput>(
      `/portfolio/showcases/${showcaseId}/clients`,
      input,
      {
        idempotencyKey: apiClient.generateIdempotencyKey(),
        correlationId: apiClient.generateCorrelationId(),
      }
    );
    return result.client;
  }

  async getClient(id: string): Promise<PortfolioClient> {
    const result = await apiClient.get<GetPortfolioClientOutput>(`/portfolio/clients/${id}`, {
      correlationId: apiClient.generateCorrelationId(),
    });
    return result.client;
  }

  async updateClient(id: string, input: UpdatePortfolioClientInput): Promise<PortfolioClient> {
    const result = await apiClient.patch<GetPortfolioClientOutput>(
      `/portfolio/clients/${id}`,
      input,
      {
        correlationId: apiClient.generateCorrelationId(),
      }
    );
    return result.client;
  }

  async deleteClient(id: string): Promise<void> {
    await apiClient.delete(`/portfolio/clients/${id}`, {
      correlationId: apiClient.generateCorrelationId(),
    });
  }

  async listServices(
    showcaseId: string,
    params: ListPortfolioServicesInput = {}
  ): Promise<ListPortfolioServicesOutput> {
    const query = buildListQuery(params);
    const endpoint = query.toString()
      ? `/portfolio/showcases/${showcaseId}/services?${query.toString()}`
      : `/portfolio/showcases/${showcaseId}/services`;
    return apiClient.get<ListPortfolioServicesOutput>(endpoint, {
      correlationId: apiClient.generateCorrelationId(),
    });
  }

  async createService(
    showcaseId: string,
    input: CreatePortfolioServiceInput
  ): Promise<PortfolioService> {
    const result = await apiClient.post<GetPortfolioServiceOutput>(
      `/portfolio/showcases/${showcaseId}/services`,
      input,
      {
        idempotencyKey: apiClient.generateIdempotencyKey(),
        correlationId: apiClient.generateCorrelationId(),
      }
    );
    return result.service;
  }

  async getService(id: string): Promise<PortfolioService> {
    const result = await apiClient.get<GetPortfolioServiceOutput>(`/portfolio/services/${id}`, {
      correlationId: apiClient.generateCorrelationId(),
    });
    return result.service;
  }

  async updateService(id: string, input: UpdatePortfolioServiceInput): Promise<PortfolioService> {
    const result = await apiClient.patch<GetPortfolioServiceOutput>(
      `/portfolio/services/${id}`,
      input,
      {
        correlationId: apiClient.generateCorrelationId(),
      }
    );
    return result.service;
  }

  async deleteService(id: string): Promise<void> {
    await apiClient.delete(`/portfolio/services/${id}`, {
      correlationId: apiClient.generateCorrelationId(),
    });
  }

  async listTeamMembers(
    showcaseId: string,
    params: ListPortfolioTeamMembersInput = {}
  ): Promise<ListPortfolioTeamMembersOutput> {
    const query = buildListQuery(params);
    const endpoint = query.toString()
      ? `/portfolio/showcases/${showcaseId}/team?${query.toString()}`
      : `/portfolio/showcases/${showcaseId}/team`;
    return apiClient.get<ListPortfolioTeamMembersOutput>(endpoint, {
      correlationId: apiClient.generateCorrelationId(),
    });
  }

  async createTeamMember(
    showcaseId: string,
    input: CreatePortfolioTeamMemberInput
  ): Promise<PortfolioTeamMember> {
    const result = await apiClient.post<GetPortfolioTeamMemberOutput>(
      `/portfolio/showcases/${showcaseId}/team`,
      input,
      {
        idempotencyKey: apiClient.generateIdempotencyKey(),
        correlationId: apiClient.generateCorrelationId(),
      }
    );
    return result.teamMember;
  }

  async getTeamMember(id: string): Promise<PortfolioTeamMember> {
    const result = await apiClient.get<GetPortfolioTeamMemberOutput>(`/portfolio/team/${id}`, {
      correlationId: apiClient.generateCorrelationId(),
    });
    return result.teamMember;
  }

  async updateTeamMember(
    id: string,
    input: UpdatePortfolioTeamMemberInput
  ): Promise<PortfolioTeamMember> {
    const result = await apiClient.patch<GetPortfolioTeamMemberOutput>(
      `/portfolio/team/${id}`,
      input,
      {
        correlationId: apiClient.generateCorrelationId(),
      }
    );
    return result.teamMember;
  }

  async deleteTeamMember(id: string): Promise<void> {
    await apiClient.delete(`/portfolio/team/${id}`, {
      correlationId: apiClient.generateCorrelationId(),
    });
  }
}

export const portfolioApi = new PortfolioApi();
