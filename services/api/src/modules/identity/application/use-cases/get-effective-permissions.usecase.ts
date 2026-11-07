import { Inject, Injectable } from "@nestjs/common";
import type { EffectivePermissionsResponse } from "@corely/contracts";
import type { UseCaseContext, TransactionContext } from "@corely/kernel";
import type { RolePermissionGrantRepositoryPort } from "../ports/role-permission-grant-repository.port";
import { ROLE_PERMISSION_GRANT_REPOSITORY_TOKEN } from "../ports/role-permission-grant-repository.port";
import {
  MEMBERSHIP_REPOSITORY_TOKEN,
  type MembershipRepositoryPort,
} from "../ports/membership-repository.port";
import { AuthorizeWorkspaceUseCase } from "../../../workspaces/public";
import { computeEffectivePermissionSet } from "../../../../shared/permissions/effective-permissions";

@Injectable()
export class GetEffectivePermissionsUseCase {
  constructor(
    @Inject(ROLE_PERMISSION_GRANT_REPOSITORY_TOKEN)
    private readonly grantRepo: RolePermissionGrantRepositoryPort,
    @Inject(MEMBERSHIP_REPOSITORY_TOKEN) private readonly memberships: MembershipRepositoryPort,
    private readonly authorizeWorkspace: AuthorizeWorkspaceUseCase
  ) {}

  async execute(
    ctx: UseCaseContext,
    tx?: TransactionContext
  ): Promise<EffectivePermissionsResponse> {
    if (!ctx.userId || ctx.tenantId === undefined) {
      return {
        permissions: {
          allowAll: false,
          allowed: [],
          denied: [],
        },
      };
    }

    const txArgs: [] | [TransactionContext] = tx ? [tx] : [];
    // Role IDs carried by a token or caller are not current membership authority.
    const membership = await this.memberships.findByTenantAndUser(
      ctx.tenantId,
      ctx.userId,
      ...txArgs
    );
    if (!membership) {
      return { permissions: { allowAll: false, allowed: [], denied: [] } };
    }
    if (ctx.workspaceId) {
      if (!ctx.tenantId) {
        return { permissions: { allowAll: false, allowed: [], denied: [] } };
      }
      await this.authorizeWorkspace.execute(
        {
          tenantId: ctx.tenantId,
          workspaceId: ctx.workspaceId,
          userId: ctx.userId,
        },
        ...txArgs
      );
    }
    const roleIds = [membership.getRoleId()];

    const grants =
      ctx.tenantId === null
        ? await this.grantRepo.listByRoleIds(roleIds, ...txArgs)
        : await this.grantRepo.listByRoleIdsAndTenant(ctx.tenantId, roleIds, ...txArgs);

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
