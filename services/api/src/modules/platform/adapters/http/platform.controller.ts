import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  Query,
  BadRequestException,
} from "@nestjs/common";
import { AuthGuard } from "../../../identity/adapters/http/auth.guard";
import { RbacGuard, RequirePermission } from "../../../identity/adapters/http/rbac.guard";
import {
  CurrentTenantId,
  CurrentUserId,
} from "../../../identity/adapters/http/current-user.decorator";
import { EnableAppUseCase } from "../../application/use-cases/enable-app.usecase";
import { DisableAppUseCase } from "../../application/use-cases/disable-app.usecase";
import { ListAppCatalogUseCase } from "../../application/use-cases/list-app-catalog.usecase";
import { AppCatalogQuerySchema, type AppCatalogItem } from "@corely/contracts";

@Controller("platform/apps")
@UseGuards(AuthGuard, RbacGuard)
export class PlatformController {
  constructor(
    private readonly enableAppUseCase: EnableAppUseCase,
    private readonly disableAppUseCase: DisableAppUseCase,
    private readonly listAppCatalogUseCase: ListAppCatalogUseCase
  ) {}

  @Get()
  @RequirePermission("platform.apps.manage")
  async listTenantApps(
    @CurrentTenantId() tenantId: string | null,
    @Query("forTenantId") forTenantId?: unknown
  ): Promise<AppCatalogItem[]> {
    const parsed = AppCatalogQuerySchema.safeParse({ forTenantId });
    if (!parsed.success) {
      throw new BadRequestException("Invalid catalog tenant selection");
    }
    // RbacGuard still requires host scope. This target is not a tenant authority selector.
    return this.listAppCatalogUseCase.execute(parsed.data.forTenantId ?? tenantId);
  }

  @Post(":appId/enable")
  @RequirePermission("platform.apps.manage")
  @HttpCode(HttpStatus.OK)
  async enableApp(
    @Param("appId") appId: string,
    @CurrentTenantId() tenantId: string,
    @CurrentUserId() userId: string
  ) {
    return await this.enableAppUseCase.execute({
      tenantId,
      appId,
      actorUserId: userId,
    });
  }

  @Post(":appId/disable")
  @RequirePermission("platform.apps.manage")
  @HttpCode(HttpStatus.OK)
  async disableApp(
    @Param("appId") appId: string,
    @Body() body: { force?: boolean },
    @CurrentTenantId() tenantId: string,
    @CurrentUserId() userId: string
  ) {
    return await this.disableAppUseCase.execute({
      tenantId,
      appId,
      actorUserId: userId,
      force: body.force,
    });
  }
}
