import { type RentalCategory } from "@corely/contracts";

export interface CategoryRepoPort {
  findById(tenantId: string, id: string): Promise<RentalCategory | null>;
  findBySlug(tenantId: string, slug: string): Promise<RentalCategory | null>;
  list(tenantId: string): Promise<RentalCategory[]>;
  save(
    tenantId: string,
    workspaceId: string,
    category: Partial<RentalCategory> & { name: string; slug: string }
  ): Promise<RentalCategory>;
  delete(tenantId: string, id: string): Promise<void>;
}

export const CATEGORY_REPO_PORT = Symbol("CATEGORY_REPO_PORT");
