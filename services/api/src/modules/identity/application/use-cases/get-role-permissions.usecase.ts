import { Inject, Injectable } from "@nestjs/common";
import type { RolePermissionsResponse, RolePermissionState } from "@corely/contracts";
import type { RoleRepositoryPort } from "../ports/role-repository.port";
import { ROLE_REPOSITORY_TOKEN } from "../ports/role-repository.port";
import type { PermissionCatalogPort } from "../ports/permission-catalog.port";
import { PERMISSION_CATALOG_PORT } from "../ports/permission-catalog.port";
import type { RolePermissionGrantRepositoryPort } from "../ports/role-permission-grant-repository.port";
import { ROLE_PERMISSION_GRANT_REPOSITORY_TOKEN } from "../ports/role-permission-grant-repository.port";
import { NotFoundError } from "../../../../shared/errors/domain-errors";
import { PLATFORM_HOST_PERMISSION_KEYS } from "../policies/platform-permissions.policy";

export interface GetRolePermissionsQuery {
  tenantId: string;
  actorUserId: string;
  roleId: string;
}

@Injectable()
export class GetRolePermissionsUseCase {
  constructor(
    @Inject(ROLE_REPOSITORY_TOKEN) private readonly roleRepo: RoleRepositoryPort,
    @Inject(PERMISSION_CATALOG_PORT) private readonly catalogPort: PermissionCatalogPort,
    @Inject(ROLE_PERMISSION_GRANT_REPOSITORY_TOKEN)
    private readonly grantRepo: RolePermissionGrantRepositoryPort
  ) {}

  async execute(query: GetRolePermissionsQuery): Promise<RolePermissionsResponse> {
    const role = await this.roleRepo.findById(query.tenantId, query.roleId);
    if (!role) {
      throw new NotFoundError("Role not found");
    }

    const catalog = this.catalogPort.getCatalog();
    const grants = await this.grantRepo.listByRoleIdsAndTenant(query.tenantId, [query.roleId]);
    const grantMap = new Map(grants.map((grant) => [grant.key, grant.effect]));

    const states: RolePermissionState[] = [];
    for (const group of catalog) {
      for (const permission of group.permissions) {
        if (query.tenantId !== null && PLATFORM_HOST_PERMISSION_KEYS.has(permission.key)) {
          continue;
        }
        const effect = grantMap.get(permission.key);
        states.push({
          key: permission.key,
          granted: effect === "ALLOW",
          effect,
        });
      }
    }

    return {
      role: {
        id: role.id,
        name: role.name,
        description: role.description ?? null,
        isSystem: role.isSystem,
        systemKey: role.systemKey ?? null,
      },
      catalog:
        query.tenantId !== null
          ? catalog
              .map((group) => ({
                ...group,
                permissions: group.permissions.filter(
                  (permission) => !PLATFORM_HOST_PERMISSION_KEYS.has(permission.key)
                ),
              }))
              .filter((group) => group.permissions.length > 0)
          : catalog,
      grants: states,
    };
  }
}
