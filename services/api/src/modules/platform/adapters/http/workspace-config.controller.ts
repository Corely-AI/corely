import {
  BadRequestException,
  Controller,
  Get,
  Inject,
  Param,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import type { Request } from "express";
import {
  CurrentRoleIds,
  CurrentTenantId,
  CurrentUserId,
} from "../../../identity/adapters/http/current-user.decorator";
import {
  ROLE_PERMISSION_GRANT_REPOSITORY_TOKEN,
  type RolePermissionGrantRepositoryPort,
} from "../../../identity/application/ports/role-permission-grant-repository.port";
import { toAllowedPermissionKeys } from "../../../../shared/permissions/effective-permissions";
import { resolveRequestContext } from "../../../../shared/request-context";
import { AuthGuard } from "../../../identity/adapters/http/auth.guard";
import { GetMenuQuerySchema, type MenuScope } from "@corely/contracts";
import { GetWorkspaceConfigUseCase } from "../../application/use-cases/get-workspace-config.usecase";

@Controller("workspaces")
@UseGuards(AuthGuard)
export class WorkspaceConfigController {
  constructor(
    private readonly getWorkspaceConfig: GetWorkspaceConfigUseCase,
    @Inject(ROLE_PERMISSION_GRANT_REPOSITORY_TOKEN)
    private readonly grantRepo: RolePermissionGrantRepositoryPort
  ) {}

  @Get(":workspaceId/config")
  async getConfig(
    @Param("workspaceId") workspaceIdParam: string,
    @Query("scope") scope: string | undefined,
    @CurrentTenantId() tenantId: string,
    @CurrentUserId() userId: string,
    @CurrentRoleIds() roleIds: string[],
    @Req() req: Request
  ) {
    const validatedScope = this.parseScope(scope);
    if (!tenantId || !userId) {
      throw new BadRequestException("Missing tenant or user context");
    }

    const ctx = (req as any).context ?? resolveRequestContext(req as any);
    const workspaceId = ctx.workspaceId ?? workspaceIdParam;

    const requestedRoles = Array.isArray(roleIds) ? roleIds : [];
    const grants =
      requestedRoles.length > 0
        ? await this.grantRepo.listByRoleIdsAndTenant(tenantId, requestedRoles)
        : [];
    const permissions = toAllowedPermissionKeys(grants);

    return this.getWorkspaceConfig.execute({
      tenantId,
      userId,
      workspaceId,
      permissions,
      scope: validatedScope,
    });
  }

  private parseScope(scope: string | undefined): MenuScope {
    const parsed = GetMenuQuerySchema.safeParse({ scope });
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.message);
    }
    return parsed.data.scope;
  }
}
