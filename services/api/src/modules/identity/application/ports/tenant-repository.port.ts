import { type Tenant } from "../../domain/entities/tenant.entity";
import type { TenantStatus } from "@corely/contracts";

export interface ListTenantsRepoQuery {
  q?: string;
  status?: TenantStatus;
  page: number;
  pageSize: number;
  sort?: string;
}

export interface ListTenantsRepoResult {
  items: Tenant[];
  total: number;
}

/**
 * Tenant Repository Port (Interface)
 */
export interface TenantRepositoryPort {
  /**
   * Create a new tenant
   */
  create(tenant: Tenant): Promise<Tenant>;

  /**
   * Find tenant by ID
   */
  findById(id: string): Promise<Tenant | null>;

  /**
   * Find tenant by slug
   */
  findBySlug(slug: string): Promise<Tenant | null>;

  /**
   * List all tenants (host-level)
   */
  listAll(query: ListTenantsRepoQuery): Promise<ListTenantsRepoResult>;

  /**
   * Check if slug exists
   */
  slugExists(slug: string): Promise<boolean>;

  /**
   * Update tenant
   */
  update(tenant: Tenant): Promise<Tenant>;
}

export const TENANT_REPOSITORY_TOKEN = "identity/tenant-repository";
