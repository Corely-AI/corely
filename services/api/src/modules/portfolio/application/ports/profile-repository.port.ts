import type { PortfolioProfile } from "../../domain/portfolio.types";

export interface ProfileRepositoryPort {
  findByShowcaseId(
    tenantId: string,
    workspaceId: string,
    showcaseId: string
  ): Promise<PortfolioProfile | null>;
  upsert(profile: Omit<PortfolioProfile, "id" | "createdAt" | "updatedAt"> & { id?: string }): Promise<PortfolioProfile>;
}

export const PROFILE_REPOSITORY_PORT = "portfolio/profile-repository";
