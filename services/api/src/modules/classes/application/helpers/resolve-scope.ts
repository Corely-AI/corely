import { ValidationFailedError } from "@corely/domain";
import type { UseCaseContext } from "@corely/kernel";

export const resolveTenantScope = (ctx: UseCaseContext) => {
  if (!ctx.tenantId) {
    throw new ValidationFailedError("tenantId is required", [
      { message: "tenantId is required", members: ["tenantId"] },
    ]);
  }
  return {
    tenantId: ctx.tenantId,
    workspaceId: ctx.workspaceId ?? ctx.tenantId,
  };
};
