import type { PortfolioShowcase, PortfolioShowcaseType } from "../../domain/portfolio.types";

export type ShowcaseListFilters = {
  q?: string;
  type?: PortfolioShowcaseType;
  isPublished?: boolean;
  sort?: string | string[];
  structuredFilters?: unknown;
};

export type ShowcaseListResult = {
  items: PortfolioShowcase[];
  total: number;
};

export interface ShowcaseRepositoryPort {
  create(
    input: Omit<PortfolioShowcase, "id" | "createdAt" | "updatedAt">
  ): Promise<PortfolioShowcase>;
  update(
    tenantId: string,
    workspaceId: string,
    showcaseId: string,
    input: Partial<
      Omit<PortfolioShowcase, "id" | "tenantId" | "workspaceId" | "createdAt" | "updatedAt">
    >
  ): Promise<PortfolioShowcase>;
  findById(
    tenantId: string,
    workspaceId: string,
    showcaseId: string
  ): Promise<PortfolioShowcase | null>;
  findBySlug(
    tenantId: string,
    workspaceId: string,
    slug: string,
    opts?: { publishedOnly?: boolean }
  ): Promise<PortfolioShowcase | null>;
  list(
    tenantId: string,
    workspaceId: string,
    filters: ShowcaseListFilters,
    pagination: { page: number; pageSize: number }
  ): Promise<ShowcaseListResult>;
  delete(tenantId: string, workspaceId: string, showcaseId: string): Promise<void>;
}

export const SHOWCASE_REPOSITORY_PORT = "portfolio/showcase-repository";
