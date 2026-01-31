import type { PortfolioClient, PortfolioClientType } from "../../domain/portfolio.types";

export type ClientListFilters = {
  q?: string;
  clientType?: PortfolioClientType;
  featured?: boolean;
  sort?: string | string[];
  structuredFilters?: unknown;
  featuredOnly?: boolean;
};

export type ClientListResult = {
  items: PortfolioClient[];
  total: number;
};

export interface ClientRepositoryPort {
  create(input: Omit<PortfolioClient, "id" | "createdAt" | "updatedAt">): Promise<PortfolioClient>;
  update(
    tenantId: string,
    workspaceId: string,
    clientId: string,
    input: Partial<Omit<PortfolioClient, "id" | "tenantId" | "workspaceId" | "createdAt" | "updatedAt">>
  ): Promise<PortfolioClient>;
  findById(tenantId: string, workspaceId: string, clientId: string): Promise<PortfolioClient | null>;
  findBySlug(
    showcaseId: string,
    slug: string
  ): Promise<PortfolioClient | null>;
  listByShowcase(
    tenantId: string,
    workspaceId: string,
    showcaseId: string,
    filters: ClientListFilters,
    pagination: { page: number; pageSize: number }
  ): Promise<ClientListResult>;
  delete(tenantId: string, workspaceId: string, clientId: string): Promise<void>;
  findByIds(
    tenantId: string,
    workspaceId: string,
    clientIds: string[]
  ): Promise<PortfolioClient[]>;
}

export const CLIENT_REPOSITORY_PORT = "portfolio/client-repository";
