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
  Inject,
  forwardRef,
} from "@nestjs/common";
import { UpdateTenantAppEnablementSchema } from "@corely/contracts";
import { AuthGuard } from "../../identity/adapters/http/auth.guard";
import { RbacGuard, RequirePermission } from "../../identity/adapters/http/rbac.guard";
import { CurrentUserId } from "../../identity/adapters/http/current-user.decorator";
import { TenantEntitlementsService } from "../application/tenant-entitlements.service";

@Controller("platform/tenants/:tenantId")
@UseGuards(AuthGuard, RbacGuard)
export class TenantEntitlementsController {
  constructor(
    @Inject(forwardRef(() => TenantEntitlementsService))
    private readonly service: TenantEntitlementsService
  ) {}

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
    @Body() body: unknown,
    @CurrentUserId() userId: string
  ) {
    const parsed = UpdateTenantAppEnablementSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException("Invalid app enablement command");
    }
    await this.service.updateAppEnablement(
      tenantId,
      appId,
      parsed.data.enabled,
      userId,
      parsed.data.cascade,
      parsed.data.expectedDependents
    );
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
