import {
  Injectable,
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  SetMetadata,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { GetEffectivePermissionsUseCase } from "../../application/use-cases/get-effective-permissions.usecase";
import {
  computeEffectivePermissionSet,
  hasPermission,
} from "../../../../shared/permissions/effective-permissions";
import {
  resolveRequestContext,
  type ContextAwareRequest,
} from "../../../../shared/request-context";
import { isPlatformHostPermissionKey } from "../../application/policies/platform-permissions.policy";

export const REQUIRE_PERMISSION = "require_permission";

@Injectable()
export class RbacGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly permissions: GetEffectivePermissionsUseCase
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<string>(REQUIRE_PERMISSION, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required) {
      return true;
    }
    const request = context.switchToHttp().getRequest<ContextAwareRequest>();
    if (!request.user?.userId) {
      throw new ForbiddenException("User not authenticated");
    }
    // Discard a context resolved before authentication; selectors are not identity.
    const ctx = resolveRequestContext(request);
    if (isPlatformHostPermissionKey(required) && ctx.tenantId !== null) {
      throw new ForbiddenException("Host scope required for platform permissions");
    }
    const { permissions } = await this.permissions.execute({
      ...ctx,
      workspaceId: ctx.workspaceId ?? undefined,
    });
    const grants = [
      ...permissions.allowed.map((key) => ({ key, effect: "ALLOW" as const })),
      ...permissions.denied.map((key) => ({ key, effect: "DENY" as const })),
      ...(permissions.allowAll ? [{ key: "*", effect: "ALLOW" as const }] : []),
    ];
    if (!hasPermission(computeEffectivePermissionSet(grants), required)) {
      throw new ForbiddenException(`User does not have permission: ${required}`);
    }
    return true;
  }
}

export const RequirePermission = (permission: string) =>
  SetMetadata(REQUIRE_PERMISSION, permission);
