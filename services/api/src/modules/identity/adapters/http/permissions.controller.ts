import { Controller, Get, Inject, UseGuards, HttpException } from "@nestjs/common";
import { AuthGuard } from "./auth.guard";
import { RbacGuard, RequirePermission } from "./rbac.guard";
import { CurrentTenantId, CurrentUserId } from "./current-user.decorator";
import { GetPermissionCatalogUseCase } from "../../application/use-cases/get-permission-catalog.usecase";
import { mapErrorToHttp } from "../../../../shared/errors/domain-errors";

@Controller("identity/permissions")
@UseGuards(AuthGuard, RbacGuard)
export class PermissionsController {
  constructor(
    @Inject(GetPermissionCatalogUseCase)
    private readonly getPermissionCatalogUseCase: GetPermissionCatalogUseCase
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

  private mapDomainError(error: unknown): HttpException {
    const { status, body } = mapErrorToHttp(error);
    return new HttpException(body, status);
  }
}
