import { ForbiddenError, ValidationFailedError } from "@corely/domain";
import type { UseCaseContext } from "@corely/kernel";

export const assertTenantContext = (ctx: UseCaseContext, tenantId?: string) => {
  if (!ctx.tenantId) {
    throw new ValidationFailedError("Missing tenant context", [
      { message: "tenantId is required", members: ["tenantId"] },
    ]);
  }
  if (tenantId && ctx.tenantId !== tenantId) {
    throw new ForbiddenError("Cross-tenant access is not allowed");
  }
};

export const assertAuthenticated = (ctx: UseCaseContext) => {
  if (!ctx.userId) {
    throw new ForbiddenError("User context is required");
  }
};

export const assertCan = (ctx: UseCaseContext, tenantId?: string) => {
  assertTenantContext(ctx, tenantId);
};
