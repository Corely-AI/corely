import {
  Controller,
  Get,
  Param,
  Patch,
  Put,
  Delete,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { AuthGuard } from "../../identity/adapters/http/auth.guard";
import { RbacGuard, RequirePermission } from "../../identity/adapters/http/rbac.guard";
import { CurrentUserId } from "../../identity/adapters/http/current-user.decorator";
import { TenantEntitlementsService } from "../application/tenant-entitlements.service";

@Controller("platform/tenants/:tenantId")
@UseGuards(AuthGuard, RbacGuard)
export class TenantEntitlementsController {
  constructor(private readonly service: TenantEntitlementsService) {}

  @Get("entitlements")
  @RequirePermission("platform.tenants.read")
  async getEntitlements(@Param("tenantId") tenantId: string) {
    return await this.service.getEntitlements(tenantId);
  }

  @Patch("apps/:appId")
  @RequirePermission("platform.tenants.entitlements.write")
  async updateAppEnablement(
    @Param("tenantId") tenantId: string,
    @Param("appId") appId: string,
    @Body() body: { enabled: boolean; cascade?: boolean },
    @CurrentUserId() userId: string
  ) {
    await this.service.updateAppEnablement(tenantId, appId, body.enabled, userId, body.cascade);
    return { success: true };
  }

  @Put("features")
  @RequirePermission("platform.tenants.features.write")
  async updateFeatures(
    @Param("tenantId") tenantId: string,
    @Body() body: { updates: { key: string; value: any }[] },
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
