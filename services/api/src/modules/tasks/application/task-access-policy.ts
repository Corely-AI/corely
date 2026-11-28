import { ForbiddenException } from "@nestjs/common";
import type { TransactionContext, UseCaseContext } from "@corely/kernel";
import type { GetEffectivePermissionsUseCase } from "../../identity/public";
import type { TenantEntitlementService } from "../../platform/public";
import type { StaffOperationsLookup } from "../../people/public";
import type { TaskScope } from "./ports/task-repository.port";
export async function authorizeTasks(
  deps: {
    permissions: GetEffectivePermissionsUseCase;
    staff: StaffOperationsLookup;
    entitlements: Pick<TenantEntitlementService, "isAppEnabled">;
  },
  ctx: UseCaseContext,
  tx?: TransactionContext
) {
  if (!ctx.tenantId || !ctx.workspaceId || !ctx.userId) {
    throw new ForbiddenException("Workspace membership required");
  }
  const { permissions } = await deps.permissions.execute(ctx, tx);
  const can = (key: string) =>
    !permissions.denied.includes(key) &&
    (permissions.allowAll || permissions.allowed.includes(key));
  if (!can("tasks.read")) {
    throw new ForbiddenException("Task access denied");
  }
  for (const app of ["tasks", "people"]) {
    if (!(await deps.entitlements.isAppEnabled(ctx.tenantId, app, tx))) {
      throw new ForbiddenException("Tasks and People must be enabled");
    }
  }
  const scope: TaskScope = { tenantId: ctx.tenantId, workspaceId: ctx.workspaceId };
  return {
    scope,
    self: await deps.staff.forAccount(scope, ctx.userId, tx),
    actorUserId: ctx.userId,
    manage: can("tasks.manage"),
    completeOwn: can("tasks.own.update"),
  };
}
