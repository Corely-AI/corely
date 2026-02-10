import { Inject, Injectable } from "@nestjs/common";
import type { ListTenantsOutput } from "@corely/contracts";
import type { UseCaseContext } from "@corely/kernel";
import {
  TENANT_REPOSITORY_TOKEN,
  type TenantRepositoryPort,
} from "../ports/tenant-repository.port";
import {
  ROLE_PERMISSION_GRANT_REPOSITORY_TOKEN,
  type RolePermissionGrantRepositoryPort,
} from "../ports/role-permission-grant-repository.port";
import {
  assertPlatformPermission,
  PLATFORM_PERMISSION_KEYS,
} from "../policies/platform-permissions.policy";

export interface ListTenantsQuery {
  actorUserId: string;
}

@Injectable()
export class ListTenantsUseCase {
  constructor(
    @Inject(TENANT_REPOSITORY_TOKEN) private readonly tenantRepo: TenantRepositoryPort,
    @Inject(ROLE_PERMISSION_GRANT_REPOSITORY_TOKEN)
    private readonly grantRepo: RolePermissionGrantRepositoryPort
  ) {}

  async execute(_query: ListTenantsQuery, ctx: UseCaseContext): Promise<ListTenantsOutput> {
    await assertPlatformPermission(ctx, PLATFORM_PERMISSION_KEYS.tenants.read, {
      grantRepo: this.grantRepo,
    });

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
