import { createParamDecorator, type ExecutionContext } from "@nestjs/common";

/**
 * @CurrentUser() decorator
 * Extracts current user from request context
 */
export const CurrentUser = createParamDecorator((data: unknown, ctx: ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest();
  return request.context?.userId ? { userId: request.context.userId } : request.user;
});

/**
 * @CurrentTenant() decorator
 * Extracts current tenant from request context
 */
export const CurrentTenant = createParamDecorator((data: unknown, ctx: ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest();
  return request.context?.tenantId ?? request.tenantId;
});

/**
 * @CurrentUserId() decorator
 */
export const CurrentUserId = createParamDecorator((data: unknown, ctx: ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest();
  return request.context?.userId ?? request.user?.userId;
});

/**
 * @CurrentTenantId() decorator
 */
export const CurrentTenantId = createParamDecorator((data: unknown, ctx: ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest();
  return request.context?.tenantId ?? request.tenantId;
});

/**
 * @CurrentRoleIds decorator
 * Returns the resolved roles for the current user/tenant context.
 */
export const CurrentRoleIds = createParamDecorator((data: unknown, ctx: ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest();
  return request.context?.roles ?? request.roleIds ?? [];
});

/**
 * @CurrentWorkspaceId decorator
 * Extracts current workspace ID from request context
 */
export const CurrentWorkspaceId = createParamDecorator((data: unknown, ctx: ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest();
  return request.context?.workspaceId ?? request.workspaceId;
});
