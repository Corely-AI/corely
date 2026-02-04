import { Controller, Get, Inject, UseGuards, HttpException, Req } from "@nestjs/common";
import type { Request } from "express";
import { AuthGuard } from "./auth.guard";
import { RbacGuard, RequirePermission } from "./rbac.guard";
import { CurrentTenantId, CurrentUserId } from "./current-user.decorator";
import { GetPermissionCatalogUseCase } from "../../application/use-cases/get-permission-catalog.usecase";
import { GetEffectivePermissionsUseCase } from "../../application/use-cases/get-effective-permissions.usecase";
import { mapErrorToHttp } from "../../../../shared/errors/domain-errors";
import { buildUseCaseContext } from "../../../../shared/http/usecase-mappers";

@Controller("identity/permissions")
@UseGuards(AuthGuard, RbacGuard)
export class PermissionsController {
  constructor(
    @Inject(GetPermissionCatalogUseCase)
    private readonly getPermissionCatalogUseCase: GetPermissionCatalogUseCase,
    @Inject(GetEffectivePermissionsUseCase)
    private readonly getEffectivePermissionsUseCase: GetEffectivePermissionsUseCase
  ) {}

  @Get("catalog")
  @RequirePermission("settings.roles.manage")
  async getCatalog(@CurrentTenantId() tenantId: string, @CurrentUserId() userId: string) {
    try {
      return await this.getPermissionCatalogUseCase.execute({ tenantId, actorUserId: userId });
    } catch (error) {
      throw this.mapDomainError(error);
    }
  }

  @Get("effective")
  async getEffectivePermissions(@Req() req: Request) {
    try {
      const ctx = buildUseCaseContext(req);
      return await this.getEffectivePermissionsUseCase.execute(ctx);
    } catch (error) {
      throw this.mapDomainError(error);
    }
  }

  private mapDomainError(error: unknown): HttpException {
    const { status, body } = mapErrorToHttp(error);
    return new HttpException(body, status);
  }
}
