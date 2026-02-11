import {
  Controller,
  Get,
  Param,
  Patch,
  Put,
  Delete,
  Body,
  UseGuards,
  BadRequestException,
} from "@nestjs/common";
import { AuthGuard } from "../../identity/adapters/http/auth.guard";
import { RbacGuard, RequirePermission } from "../../identity/adapters/http/rbac.guard";
import { CurrentUserId } from "../../identity/adapters/http/current-user.decorator";
import { TenantEntitlementsService } from "../application/tenant-entitlements.service";
import { UpdateAppPolicyInputSchema, UpdateTenantAppSettingInputSchema } from "@corely/contracts";

@Controller("platform/tenants/:tenantId")
@UseGuards(AuthGuard, RbacGuard)
export class TenantEntitlementsController {
  constructor(private readonly service: TenantEntitlementsService) {}

  @Get("entitlements")
  @RequirePermission("platform.tenants.read")
  async getEntitlements(@Param("tenantId") tenantId: string) {
    return await this.service.getEntitlements(tenantId);
  }

  @Get("apps/effective")
  @RequirePermission("platform.tenants.read")
  async getEffectiveApps(@Param("tenantId") tenantId: string) {
    return await this.service.getEffectiveApps(tenantId);
  }

  @Patch("apps/:appId")
  @RequirePermission("platform.apps.manage")
  async updateAppEnablement(
    @Param("tenantId") tenantId: string,
    @Param("appId") appId: string,
    @Body() body: { enabled: boolean; cascade?: boolean },
    @CurrentUserId() userId: string
  ) {
    await this.service.updateAppEnablement(tenantId, appId, body.enabled, userId, body.cascade);
    return { success: true };
  }

  @Patch("apps/:appId/policy")
  @RequirePermission("platform.apps.manage")
  async updateAppPolicy(
    @Param("tenantId") tenantId: string,
    @Param("appId") appId: string,
    @Body() body: unknown,
    @CurrentUserId() userId: string
  ) {
    const parsed = UpdateAppPolicyInputSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.message);
    }
    await this.service.updateAppPolicy(tenantId, appId, parsed.data, userId);
    return { success: true };
  }

  @Patch("apps/:appId/setting")
  @RequirePermission("platform.apps.manage")
  async updateTenantAppSettingByHost(
    @Param("tenantId") tenantId: string,
    @Param("appId") appId: string,
    @Body() body: unknown,
    @CurrentUserId() userId: string
  ) {
    const parsed = UpdateTenantAppSettingInputSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.message);
    }
    await this.service.updateTenantAppSetting(tenantId, appId, parsed.data, userId);
    return { success: true };
  }

  @Put("features")
  @RequirePermission("platform.tenants.features.write")
  async updateFeatures(
    @Param("tenantId") tenantId: string,
    @Body() body: { updates: { key: string; value: unknown }[] },
    @CurrentUserId() userId: string
  ) {
    await this.service.updateFeatures(tenantId, body.updates, userId);
    return { success: true };
  }

  @Delete("features/:featureKey")
  @RequirePermission("platform.tenants.features.write")
  async resetFeature(@Param("tenantId") tenantId: string, @Param("featureKey") featureKey: string) {
    await this.service.resetFeature(tenantId, featureKey);
    return { success: true };
  }
}
