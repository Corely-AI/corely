import type { PortfolioContentStatus, PortfolioTeamMember } from "../../domain/portfolio.types";

export type TeamListFilters = {
  q?: string;
  status?: PortfolioContentStatus;
  sort?: string | string[];
  structuredFilters?: unknown;
  publishedOnly?: boolean;
};

export type TeamListResult = {
  items: PortfolioTeamMember[];
  total: number;
};

export interface TeamRepositoryPort {
  create(
    input: Omit<PortfolioTeamMember, "id" | "createdAt" | "updatedAt">
  ): Promise<PortfolioTeamMember>;
  update(
    tenantId: string,
    workspaceId: string,
    memberId: string,
    input: Partial<
      Omit<PortfolioTeamMember, "id" | "tenantId" | "workspaceId" | "createdAt" | "updatedAt">
    >
  ): Promise<PortfolioTeamMember>;
  findById(
    tenantId: string,
    workspaceId: string,
    memberId: string
  ): Promise<PortfolioTeamMember | null>;
  listByShowcase(
    tenantId: string,
    workspaceId: string,
    showcaseId: string,
    filters: TeamListFilters,
    pagination: { page: number; pageSize: number }
  ): Promise<TeamListResult>;
  delete(tenantId: string, workspaceId: string, memberId: string): Promise<void>;
}

export const TEAM_REPOSITORY_PORT = "portfolio/team-repository";
