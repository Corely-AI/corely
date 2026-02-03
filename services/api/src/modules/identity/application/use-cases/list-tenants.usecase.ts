import { Inject, Injectable } from "@nestjs/common";
import type { ListTenantsOutput } from "@corely/contracts";
import {
  TENANT_REPOSITORY_TOKEN,
  type TenantRepositoryPort,
} from "../ports/tenant-repository.port";

export interface ListTenantsQuery {
  actorUserId: string;
}

@Injectable()
export class ListTenantsUseCase {
  constructor(@Inject(TENANT_REPOSITORY_TOKEN) private readonly tenantRepo: TenantRepositoryPort) {}

  async execute(_query: ListTenantsQuery): Promise<ListTenantsOutput> {
    const tenants = await this.tenantRepo.listAll();
    return {
      tenants: tenants.map((tenant) => ({
        id: tenant.getId(),
        name: tenant.getName(),
        slug: tenant.getSlug(),
      })),
    };
  }
}
