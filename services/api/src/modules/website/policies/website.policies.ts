import type { UseCaseContext } from "@corely/kernel";
import { ForbiddenError, ValidationError } from "@corely/kernel";

export const assertWebsiteRead = (ctx: UseCaseContext, tenantId?: string) => {
  if (!ctx.tenantId) {
    throw new ValidationError("tenantId is required");
  }
  if (tenantId && ctx.tenantId !== tenantId) {
    throw new ForbiddenError("Cross-tenant access is not allowed");
  }
};

export const assertWebsiteWrite = (ctx: UseCaseContext, tenantId?: string) => {
  assertWebsiteRead(ctx, tenantId);
  if (!ctx.userId) {
    throw new ForbiddenError("User context is required");
  }
};

export const assertWebsitePublish = (ctx: UseCaseContext, tenantId?: string) => {
  assertWebsiteWrite(ctx, tenantId);
};
