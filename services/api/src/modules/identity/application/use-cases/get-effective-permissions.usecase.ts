import { Inject, Injectable } from "@nestjs/common";
import type { EffectivePermissionsResponse } from "@corely/contracts";
import type { UseCaseContext } from "@corely/kernel";
import type { RolePermissionGrantRepositoryPort } from "../ports/role-permission-grant-repository.port";
import { ROLE_PERMISSION_GRANT_REPOSITORY_TOKEN } from "../ports/role-permission-grant-repository.port";
import type { RoleRepositoryPort } from "../ports/role-repository.port";
import { ROLE_REPOSITORY_TOKEN } from "../ports/role-repository.port";
import { computeEffectivePermissionSet } from "../../../../shared/permissions/effective-permissions";

@Injectable()
export class GetEffectivePermissionsUseCase {
  constructor(
    @Inject(ROLE_PERMISSION_GRANT_REPOSITORY_TOKEN)
    private readonly grantRepo: RolePermissionGrantRepositoryPort,
    @Inject(ROLE_REPOSITORY_TOKEN)
    private readonly roleRepo: RoleRepositoryPort
  ) {}

  async execute(ctx: UseCaseContext): Promise<EffectivePermissionsResponse> {
    const roleIds = ctx.roles ?? [];
    if (!ctx.userId || roleIds.length === 0 || ctx.tenantId === undefined) {
      return {
        permissions: {
          allowAll: false,
          allowed: [],
          denied: [],
        },
      };
    }

    if (ctx.tenantId !== null) {
      for (const roleId of roleIds) {
        const role = await this.roleRepo.findById(ctx.tenantId, roleId);
        if (role?.systemKey === "OWNER") {
          return {
            permissions: {
              allowAll: true,
              allowed: [],
              denied: [],
            },
          };
        }
      }
    }

    const grants =
      ctx.tenantId === null
        ? await this.grantRepo.listByRoleIds(roleIds)
        : await this.grantRepo.listByRoleIdsAndTenant(ctx.tenantId, roleIds);

    const effective = computeEffectivePermissionSet(grants);

    return {
      permissions: {
        allowAll: effective.allowAll,
        allowed: Array.from(effective.allowed),
        denied: Array.from(effective.denied),
      },
    };
  }
}
