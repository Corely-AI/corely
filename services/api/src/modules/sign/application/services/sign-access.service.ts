import { ForbiddenException, Injectable } from "@nestjs/common";
import type { TransactionContext, UseCaseContext } from "@corely/kernel";
import { GetWorkspacePermissionsUseCase } from "../../../identity/public";
import { TenantEntitlementService } from "../../../platform/public";

@Injectable()
export class SignAccessService {
  constructor(
    private readonly permissions: GetWorkspacePermissionsUseCase,
    private readonly entitlement: TenantEntitlementService
  ) {}
  async authorize(
    ctx: UseCaseContext,
    tx?: TransactionContext,
    required: readonly string[] = ["sign.templates.manage"]
  ) {
    const { tenantId, workspaceId, userId } = ctx;
    if (!tenantId || !workspaceId || !userId) {
      throw new ForbiddenException("Workspace membership required");
    }
    const { permissions } = await this.permissions.execute(ctx, tx);

    if (
      required.some(
        (permission) =>
          permissions.denied.includes(permission) ||
          !(permissions.allowAll || permissions.allowed.includes(permission))
      ) ||
      !(await this.entitlement.isAppEnabled(tenantId, "sign", tx))
    ) {
      throw new ForbiddenException("Sign template access denied");
    }
    return { scope: { tenantId, workspaceId }, userId };
  }
}
