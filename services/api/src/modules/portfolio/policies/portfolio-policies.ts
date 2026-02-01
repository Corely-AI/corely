import type { UseCaseContext } from "@corely/kernel";
import { ForbiddenError, ValidationError } from "@corely/kernel";

export const assertPortfolioRead = (ctx: UseCaseContext, tenantId?: string) => {
  if (!ctx.tenantId) {
    throw new ValidationError("tenantId is required");
  }
  if (tenantId && ctx.tenantId !== tenantId) {
    throw new ForbiddenError("Cross-tenant access is not allowed");
  }
};

export const assertPortfolioWrite = (ctx: UseCaseContext, tenantId?: string) => {
  assertPortfolioRead(ctx, tenantId);
  if (!ctx.userId) {
    throw new ForbiddenError("User context is required");
  }
};

export const assertPortfolioPublish = (ctx: UseCaseContext, tenantId?: string) => {
  assertPortfolioWrite(ctx, tenantId);
};
