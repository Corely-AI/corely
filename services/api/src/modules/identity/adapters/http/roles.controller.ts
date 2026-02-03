import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Patch,
  Post,
  Put,
  UseGuards,
  Headers,
  HttpException,
} from "@nestjs/common";
import {
  CreateRoleInputSchema,
  UpdateRoleInputSchema,
  UpdateRolePermissionsRequestSchema,
} from "@corely/contracts";
import { AuthGuard } from "./auth.guard";
import { RbacGuard, RequirePermission } from "./rbac.guard";
import { CurrentTenantId, CurrentUserId } from "./current-user.decorator";
import { RequireWorkspaceCapability, WorkspaceCapabilityGuard } from "../../../platform";
import { ListRolesUseCase } from "../../application/use-cases/list-roles.usecase";
import { CreateRoleUseCase } from "../../application/use-cases/create-role.usecase";
import { UpdateRoleUseCase } from "../../application/use-cases/update-role.usecase";
import { DeleteRoleUseCase } from "../../application/use-cases/delete-role.usecase";
import { GetRolePermissionsUseCase } from "../../application/use-cases/get-role-permissions.usecase";
import { UpdateRolePermissionsUseCase } from "../../application/use-cases/update-role-permissions.usecase";
import { SyncRolePermissionsFromManifestsUseCase } from "../../application/use-cases/sync-role-permissions-from-manifests.usecase";
import {
  PERMISSION_CATALOG_PORT,
  type PermissionCatalogPort,
} from "../../application/ports/permission-catalog.port";
import {
  ROLE_REPOSITORY_TOKEN,
  type RoleRepositoryPort,
} from "../../application/ports/role-repository.port";
import { buildRequestContext } from "../../../../shared/context/request-context";
import { mapErrorToHttp, ValidationError } from "../../../../shared/errors/domain-errors";

@Controller("identity/roles")
@UseGuards(AuthGuard, RbacGuard, WorkspaceCapabilityGuard)
@RequireWorkspaceCapability("workspace.rbac")
export class RolesController {
  constructor(
    @Inject(ListRolesUseCase) private readonly listRolesUseCase: ListRolesUseCase,
    @Inject(CreateRoleUseCase) private readonly createRoleUseCase: CreateRoleUseCase,
    @Inject(UpdateRoleUseCase) private readonly updateRoleUseCase: UpdateRoleUseCase,
    @Inject(DeleteRoleUseCase) private readonly deleteRoleUseCase: DeleteRoleUseCase,
    @Inject(GetRolePermissionsUseCase)
    private readonly getRolePermissionsUseCase: GetRolePermissionsUseCase,
    @Inject(UpdateRolePermissionsUseCase)
    private readonly updateRolePermissionsUseCase: UpdateRolePermissionsUseCase,
    @Inject(SyncRolePermissionsFromManifestsUseCase)
    private readonly syncRolePermissionsFromManifests: SyncRolePermissionsFromManifestsUseCase,
    @Inject(PERMISSION_CATALOG_PORT) private readonly catalogPort: PermissionCatalogPort,
    @Inject(ROLE_REPOSITORY_TOKEN) private readonly roleRepo: RoleRepositoryPort
  ) {}

  @Get()
  @RequirePermission("settings.roles.manage")
  async list(@CurrentTenantId() tenantId: string, @CurrentUserId() userId: string) {
    try {
      return await this.listRolesUseCase.execute({ tenantId, actorUserId: userId });
    } catch (error) {
      throw this.mapDomainError(error);
    }
  }

  @Post()
  @RequirePermission("settings.roles.manage")
  async create(
    @Body() body: unknown,
    @CurrentTenantId() tenantId: string,
    @CurrentUserId() userId: string
  ) {
    try {
      const input = CreateRoleInputSchema.parse(body);
      const role = await this.createRoleUseCase.execute({
        tenantId,
        actorUserId: userId,
        name: input.name,
        description: input.description ?? null,
      });
      return { role };
    } catch (error) {
      throw this.mapDomainError(error);
    }
  }

  @Patch(":roleId")
  @RequirePermission("settings.roles.manage")
  async update(
    @Param("roleId") roleId: string,
    @Body() body: unknown,
    @CurrentTenantId() tenantId: string,
    @CurrentUserId() userId: string
  ) {
    try {
      const input = UpdateRoleInputSchema.parse(body);
      const role = await this.updateRoleUseCase.execute({
        tenantId,
        actorUserId: userId,
        roleId,
        name: input.name,
        description: input.description,
      });
      return { role };
    } catch (error) {
      throw this.mapDomainError(error);
    }
  }

  @Delete(":roleId")
  @RequirePermission("settings.roles.manage")
  async remove(
    @Param("roleId") roleId: string,
    @CurrentTenantId() tenantId: string,
    @CurrentUserId() userId: string
  ) {
    try {
      await this.deleteRoleUseCase.execute({ tenantId, actorUserId: userId, roleId });
      return { success: true };
    } catch (error) {
      throw this.mapDomainError(error);
    }
  }

  @Get(":roleId/permissions")
  @RequirePermission("settings.roles.manage")
  async getRolePermissions(
    @Param("roleId") roleId: string,
    @CurrentTenantId() tenantId: string,
    @CurrentUserId() userId: string
  ) {
    try {
      return await this.getRolePermissionsUseCase.execute({
        tenantId,
        actorUserId: userId,
        roleId,
      });
    } catch (error) {
      throw this.mapDomainError(error);
    }
  }

  @Put(":roleId/permissions")
  @RequirePermission("settings.roles.manage")
  async updateRolePermissions(
    @Param("roleId") roleId: string,
    @Body() body: unknown,
    @CurrentTenantId() tenantId: string,
    @CurrentUserId() userId: string,
    @Headers("x-request-id") requestId?: string
  ) {
    try {
      const input = UpdateRolePermissionsRequestSchema.parse(body);
      const grants = input.grants.map((grant) => ({
        key: String(grant.key),
        effect: (grant.effect ?? "ALLOW") as "ALLOW" | "DENY",
      }));
      await this.updateRolePermissionsUseCase.execute({
        tenantId,
        actorUserId: userId,
        roleId,
        grants,
        context: buildRequestContext({ requestId, tenantId, actorUserId: userId }),
      });
      return { success: true };
    } catch (error) {
      throw this.mapDomainError(error);
    }
  }

  @Post(":roleId/permissions/sync-manifests")
  @RequirePermission("settings.roles.manage")
  async syncRolePermissions(
    @Param("roleId") roleId: string,
    @CurrentTenantId() tenantId: string,
    @CurrentUserId() userId: string
  ) {
    try {
      return await this.syncRolePermissionsFromManifests.execute({
        tenantId,
        actorUserId: userId,
        roleId,
      });
    } catch (error) {
      throw this.mapDomainError(error);
    }
  }

  @Post(":roleId/permissions/sync-all")
  @RequirePermission("settings.roles.manage")
  async syncAllRolePermissions(
    @Param("roleId") roleId: string,
    @CurrentTenantId() tenantId: string,
    @CurrentUserId() userId: string
  ) {
    try {
      const role = await this.roleRepo.findById(tenantId, roleId);
      if (!role) {
        throw new ValidationError("Role not found");
      }
      if (role.systemKey !== "OWNER") {
        throw new ValidationError("Only the OWNER role can be synced with all permissions");
      }
      const catalog = this.catalogPort.getCatalog();
      const grants = catalog.flatMap((group) =>
        group.permissions.map((permission) => ({
          key: String(permission.key),
          effect: "ALLOW" as const,
        }))
      ) as Array<{ key: string; effect: "ALLOW" | "DENY" }>;
      await this.updateRolePermissionsUseCase.execute({
        tenantId,
        actorUserId: userId,
        roleId,
        grants,
      });
      return { success: true, grantedCount: grants.length };
    } catch (error) {
      throw this.mapDomainError(error);
    }
  }

  private mapDomainError(error: unknown): HttpException {
    const { status, body } = mapErrorToHttp(error);
    return new HttpException(body, status);
  }
}
