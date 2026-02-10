import { ForbiddenError } from "@corely/domain";
import type { UseCaseContext } from "@corely/kernel";
import { assertCan, assertAuthenticated } from "@/shared/policies/assert-can";

export const assertCanClasses = (ctx: UseCaseContext, permission: string) => {
  assertCan(ctx);
  assertAuthenticated(ctx);

  const permissions = (ctx.metadata as any)?.permissions;
  if (!permissions) {
    return;
  }
  if (Array.isArray(permissions) && permissions.length > 0) {
    if (permissions.includes("*") || permissions.includes(permission)) {
      return;
    }
    throw new ForbiddenError("Missing permission", "Classes:PermissionDenied");
  }
};
