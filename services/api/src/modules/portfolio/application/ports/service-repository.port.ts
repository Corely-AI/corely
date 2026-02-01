import type { PortfolioContentStatus, PortfolioService } from "../../domain/portfolio.types";

export type ServiceListFilters = {
  q?: string;
  status?: PortfolioContentStatus;
  sort?: string | string[];
  structuredFilters?: unknown;
  publishedOnly?: boolean;
};

export type ServiceListResult = {
  items: PortfolioService[];
  total: number;
};

export interface ServiceRepositoryPort {
  create(
    input: Omit<PortfolioService, "id" | "createdAt" | "updatedAt">
  ): Promise<PortfolioService>;
  update(
    tenantId: string,
    workspaceId: string,
    serviceId: string,
    input: Partial<
      Omit<PortfolioService, "id" | "tenantId" | "workspaceId" | "createdAt" | "updatedAt">
    >
  ): Promise<PortfolioService>;
  findById(
    tenantId: string,
    workspaceId: string,
    serviceId: string
  ): Promise<PortfolioService | null>;
  findBySlug(showcaseId: string, slug: string): Promise<PortfolioService | null>;
  listByShowcase(
    tenantId: string,
    workspaceId: string,
    showcaseId: string,
    filters: ServiceListFilters,
    pagination: { page: number; pageSize: number }
  ): Promise<ServiceListResult>;
  delete(tenantId: string, workspaceId: string, serviceId: string): Promise<void>;
}

export const SERVICE_REPOSITORY_PORT = "portfolio/service-repository";
