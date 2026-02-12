import { Inject, Injectable } from "@nestjs/common";
import { type ListTenantsOutput, type TenantStatus } from "@corely/contracts";
import { type UseCaseContext } from "@corely/kernel";
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
import { buildPageInfo } from "../../../../shared/http/pagination";

export interface ListTenantsQuery {
  actorUserId: string;
  q?: string;
  status?: TenantStatus;
  page?: number;
  pageSize?: number;
  sort?: string | string[];
}

@Injectable()
export class ListTenantsUseCase {
  constructor(
    @Inject(TENANT_REPOSITORY_TOKEN) private readonly tenantRepo: TenantRepositoryPort,
    @Inject(ROLE_PERMISSION_GRANT_REPOSITORY_TOKEN)
    private readonly grantRepo: RolePermissionGrantRepositoryPort
  ) {}

  async execute(query: ListTenantsQuery, ctx: UseCaseContext): Promise<ListTenantsOutput> {
    await assertPlatformPermission(ctx, PLATFORM_PERMISSION_KEYS.tenants.read, {
      grantRepo: this.grantRepo,
    });

    const page = Math.max(query.page ?? 1, 1);
    const pageSize = Math.max(query.pageSize ?? 20, 1);
    const sort = Array.isArray(query.sort) ? query.sort[0] : query.sort;

    const { items, total } = await this.tenantRepo.listAll({
      q: query.q,
      status: query.status,
      page,
      pageSize,
      sort,
    });

    return {
      tenants: items.map((tenant) => ({
        id: tenant.getId(),
        name: tenant.getName(),
        slug: tenant.getSlug(),
        status: tenant.getStatus() as TenantStatus,
      })),
      pageInfo: buildPageInfo(total, page, pageSize),
    };
  }
}
