import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  SetMetadata,
  Inject,
  Logger,
  forwardRef,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { MembershipRepositoryPort } from "../../application/ports/membership-repository.port";
import { MEMBERSHIP_REPOSITORY_TOKEN } from "../../application/ports/membership-repository.port";
import type { RolePermissionGrantRepositoryPort } from "../../application/ports/role-permission-grant-repository.port";
import { ROLE_PERMISSION_GRANT_REPOSITORY_TOKEN } from "../../application/ports/role-permission-grant-repository.port";
import {
  computeEffectivePermissionSet,
  hasPermission,
} from "../../../../shared/permissions/effective-permissions";
import { PlatformModule, WorkspaceTemplateService } from "../../../platform";
import { resolveRequestContext } from "../../../../shared/request-context";
import {
  WORKSPACE_REPOSITORY_PORT,
  type WorkspaceRepositoryPort,
} from "../../../workspaces/application/ports/workspace-repository.port";

export const REQUIRE_PERMISSION = "require_permission";

/**
 * RBAC Guard
 * Checks if user has required permission in the current tenant
 * Usage: @UseGuards(RbacGuard) @Require Permission('invoice.write')
 */
@Injectable()
export class RbacGuard implements CanActivate {
  private readonly logger = new Logger(RbacGuard.name);

  constructor(
    private readonly reflector: Reflector,
    @Inject(MEMBERSHIP_REPOSITORY_TOKEN)
    private readonly membershipRepo: MembershipRepositoryPort,
    @Inject(ROLE_PERMISSION_GRANT_REPOSITORY_TOKEN)
    private readonly grantRepo: RolePermissionGrantRepositoryPort,
    @Inject(forwardRef(() => WorkspaceTemplateService))
    private readonly workspaceTemplateService: WorkspaceTemplateService,
    @Inject(WORKSPACE_REPOSITORY_PORT)
    private readonly workspaceRepo: WorkspaceRepositoryPort
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermission = this.reflector.get<string>(REQUIRE_PERMISSION, context.getHandler());

    if (!requiredPermission) {
      return true; // No permission required
    }

    const request = context.switchToHttp().getRequest();
    const ctx = request.context ?? resolveRequestContext(request);
    const userId = ctx?.userId ?? request.user?.userId;
    const tenantId = ctx?.tenantId ?? request.tenantId;
    const workspaceId = (ctx?.workspaceId as string | null | undefined) ?? null;

    if (!userId) {
      throw new ForbiddenException("User not authenticated");
    }

    // If workspace has RBAC disabled, allow access (capability gate handles visibility)
    if (workspaceId && tenantId) {
      const workspace = await this.workspaceRepo.getWorkspaceByIdWithLegalEntity(
        tenantId,
        workspaceId
      );
      if (workspace) {
        const workspaceKind = workspace.legalEntity?.kind === "COMPANY" ? "COMPANY" : "PERSONAL";
        const capabilities = this.workspaceTemplateService.getDefaultCapabilities(workspaceKind);
        if (!capabilities["workspace.rbac"]) {
          return true;
        }
      }
    }

    const roleIds: string[] = [];

    // 1. Fetch Host Membership (Super Admin)
    const hostMembership = await this.membershipRepo.findHostMembership(userId);
    if (hostMembership) {
      roleIds.push(hostMembership.getRoleId());
    }

    // 2. Fetch Tenant Membership
    if (tenantId) {
      const tenantMembership = await this.membershipRepo.findByTenantAndUser(tenantId, userId);
      if (tenantMembership) {
        roleIds.push(tenantMembership.getRoleId());
      }
    }

    if (roleIds.length === 0) {
      if (tenantId) {
        throw new ForbiddenException("User is not a member of this tenant");
      }
      throw new ForbiddenException("Access denied");
    }

    // 3. Resolve permissions from all roles (Host + Tenant)
    const grants = await this.grantRepo.listByRoleIds(roleIds);
    const grantSet = computeEffectivePermissionSet(grants);
    const canAccess = hasPermission(grantSet, requiredPermission);

    if (!canAccess) {
      throw new ForbiddenException(`User does not have permission: ${requiredPermission}`);
    }

    return true;
  }
}

/**
 * Decorator to require a specific permission
 */
export const RequirePermission = (permission: string) => {
  return SetMetadata(REQUIRE_PERMISSION, permission);
};
