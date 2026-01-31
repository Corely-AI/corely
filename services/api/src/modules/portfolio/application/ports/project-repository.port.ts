import type {
  PortfolioContentStatus,
  PortfolioProject,
  PortfolioProjectType,
} from "../../domain/portfolio.types";

export type ProjectListFilters = {
  q?: string;
  status?: PortfolioContentStatus;
  type?: PortfolioProjectType;
  featured?: boolean;
  sort?: string | string[];
  structuredFilters?: unknown;
  publishedOnly?: boolean;
};

export type ProjectListResult = {
  items: PortfolioProject[];
  total: number;
};

export interface ProjectRepositoryPort {
  create(input: Omit<PortfolioProject, "id" | "createdAt" | "updatedAt">): Promise<PortfolioProject>;
  update(
    tenantId: string,
    workspaceId: string,
    projectId: string,
    input: Partial<Omit<PortfolioProject, "id" | "tenantId" | "workspaceId" | "createdAt" | "updatedAt">>
  ): Promise<PortfolioProject>;
  findById(tenantId: string, workspaceId: string, projectId: string): Promise<PortfolioProject | null>;
  findBySlug(
    showcaseId: string,
    slug: string,
    opts?: { publishedOnly?: boolean }
  ): Promise<PortfolioProject | null>;
  listByShowcase(
    tenantId: string,
    workspaceId: string,
    showcaseId: string,
    filters: ProjectListFilters,
    pagination: { page: number; pageSize: number }
  ): Promise<ProjectListResult>;
  delete(tenantId: string, workspaceId: string, projectId: string): Promise<void>;
  setClients(
    tenantId: string,
    workspaceId: string,
    projectId: string,
    clientIds: string[]
  ): Promise<void>;
  listClientIds(tenantId: string, workspaceId: string, projectId: string): Promise<string[]>;
}

export const PROJECT_REPOSITORY_PORT = "portfolio/project-repository";
