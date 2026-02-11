import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  BadRequestException,
  ConflictException,
} from "@nestjs/common";
import { AuthGuard } from "../../../identity/adapters/http/auth.guard";
import { RbacGuard, RequirePermission } from "../../../identity/adapters/http/rbac.guard";
import {
  CurrentTenantId,
  CurrentUserId,
} from "../../../identity/adapters/http/current-user.decorator";
import { EnableAppUseCase } from "../../application/use-cases/enable-app.usecase";
import { DisableAppUseCase } from "../../application/use-cases/disable-app.usecase";
import {
  TENANT_APP_INSTALL_REPOSITORY_TOKEN,
  type TenantAppInstallRepositoryPort,
} from "../../application/ports/tenant-app-install-repository.port";
import {
  APP_REGISTRY_TOKEN,
  type AppRegistryPort,
} from "../../application/ports/app-registry.port";
import { Inject } from "@nestjs/common";
import type { AppCatalogItem } from "@corely/contracts";
import { UpdateTenantAppSettingInputSchema } from "@corely/contracts";
import { TenantEntitlementsService } from "../../../platform-entitlements/application/tenant-entitlements.service";
import { isSystemAppId } from "../../system-apps";

@Controller("platform/apps")
@UseGuards(AuthGuard, RbacGuard)
export class PlatformController {
  constructor(
    private readonly enableAppUseCase: EnableAppUseCase,
    private readonly disableAppUseCase: DisableAppUseCase,
    private readonly tenantEntitlementsService: TenantEntitlementsService,
    @Inject(TENANT_APP_INSTALL_REPOSITORY_TOKEN)
    private readonly appInstallRepo: TenantAppInstallRepositoryPort,
    @Inject(APP_REGISTRY_TOKEN)
    private readonly appRegistry: AppRegistryPort
  ) {}

  @Get()
  @RequirePermission("platform.apps.manage")
  async listTenantApps(@CurrentTenantId() tenantId: string | null): Promise<AppCatalogItem[]> {
    // Get all apps from registry
    const allApps = this.appRegistry.list();

    // If no tenant context, return all apps as disabled
    if (!tenantId) {
      return allApps.map((app) => ({
        ...app,
        enabled: isSystemAppId(app.appId),
      }));
    }

    // Get tenant install states
    const installs = await this.appInstallRepo.listByTenant(tenantId);
    const installsMap = new Map(installs.map((i) => [i.appId, i]));

    // Combine
    return allApps.map((app) => {
      const install = installsMap.get(app.appId);
      return {
        appId: app.appId,
        name: app.name,
        tier: app.tier,
        version: app.version,
        description: app.description,
        dependencies: app.dependencies,
        enabled: isSystemAppId(app.appId) ? true : (install?.enabled ?? false),
      };
    });
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
    if (isSystemAppId(appId)) {
      throw new ConflictException({
        code: "SYSTEM_APP_LOCKED",
        message: `System app "${appId}" is always enabled and cannot be disabled`,
      });
    }
    return await this.disableAppUseCase.execute({
      tenantId,
      appId,
      actorUserId: userId,
      force: body.force,
    });
  }

  @Get("effective")
  @RequirePermission("tenant.apps.read")
  async listEffectiveAppsForTenant(@CurrentTenantId() tenantId: string | null) {
    if (!tenantId) {
      throw new BadRequestException("Tenant scope required");
    }
    return await this.tenantEntitlementsService.getEffectiveApps(tenantId);
  }

  @Patch(":appId/setting")
  @RequirePermission("tenant.apps.manage")
  @HttpCode(HttpStatus.OK)
  async updateTenantAppSetting(
    @Param("appId") appId: string,
    @Body() body: unknown,
    @CurrentTenantId() tenantId: string | null,
    @CurrentUserId() userId: string
  ) {
    if (!tenantId) {
      throw new BadRequestException("Tenant scope required");
    }
    const parsed = UpdateTenantAppSettingInputSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.message);
    }
    await this.tenantEntitlementsService.updateTenantAppSetting(
      tenantId,
      appId,
      parsed.data,
      userId
    );
    return { success: true };
  }
}
