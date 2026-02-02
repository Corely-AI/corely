import type {
  PublicPortfolioClientsOutput,
  PublicPortfolioProjectOutput,
  PublicPortfolioProjectsOutput,
  PublicPortfolioServicesOutput,
  PublicPortfolioShowcaseOutput,
  PublicPortfolioTeamMembersOutput,
} from "@corely/contracts";
import { apiClient } from "./api-client";

export class PortfolioPublicApi {
  async getShowcaseBySlug(slug: string): Promise<PublicPortfolioShowcaseOutput> {
    return apiClient.get<PublicPortfolioShowcaseOutput>(`/public/portfolio/showcases/${slug}`, {
      correlationId: apiClient.generateCorrelationId(),
    });
  }

  async resolveShowcaseByDomain(host: string): Promise<PublicPortfolioShowcaseOutput> {
    return apiClient.get<PublicPortfolioShowcaseOutput>(
      `/public/portfolio/resolve?host=${encodeURIComponent(host)}`,
      {
        correlationId: apiClient.generateCorrelationId(),
      }
    );
  }

  async listProjects(slug: string): Promise<PublicPortfolioProjectsOutput> {
    return apiClient.get<PublicPortfolioProjectsOutput>(
      `/public/portfolio/showcases/${slug}/projects`,
      {
        correlationId: apiClient.generateCorrelationId(),
      }
    );
  }

  async getProject(slug: string, projectSlug: string): Promise<PublicPortfolioProjectOutput> {
    return apiClient.get<PublicPortfolioProjectOutput>(
      `/public/portfolio/showcases/${slug}/projects/${projectSlug}`,
      {
        correlationId: apiClient.generateCorrelationId(),
      }
    );
  }

  async listClients(slug: string): Promise<PublicPortfolioClientsOutput> {
    return apiClient.get<PublicPortfolioClientsOutput>(
      `/public/portfolio/showcases/${slug}/clients`,
      {
        correlationId: apiClient.generateCorrelationId(),
      }
    );
  }

  async listServices(slug: string): Promise<PublicPortfolioServicesOutput> {
    return apiClient.get<PublicPortfolioServicesOutput>(
      `/public/portfolio/showcases/${slug}/services`,
      {
        correlationId: apiClient.generateCorrelationId(),
      }
    );
  }

  async listTeam(slug: string): Promise<PublicPortfolioTeamMembersOutput> {
    return apiClient.get<PublicPortfolioTeamMembersOutput>(
      `/public/portfolio/showcases/${slug}/team`,
      {
        correlationId: apiClient.generateCorrelationId(),
      }
    );
  }
}

export const portfolioPublicApi = new PortfolioPublicApi();
