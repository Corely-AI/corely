import { Module } from "@nestjs/common";
import { DataModule } from "@corely/data";
import { IdentityModule } from "../identity";
import { PlatformModule } from "../platform/platform.module";
import { FeatureCatalogService } from "./application/feature-catalog.service";
import { TenantEntitlementsService } from "./application/tenant-entitlements.service";
import { TenantEntitlementsController } from "./http/tenant-entitlements.controller";
import { PlatformEntitlementGuard } from "./http/entitlement.guard";

@Module({
  imports: [DataModule, PlatformModule, IdentityModule],
  controllers: [TenantEntitlementsController],
  providers: [FeatureCatalogService, TenantEntitlementsService, PlatformEntitlementGuard],
  exports: [TenantEntitlementsService, FeatureCatalogService, PlatformEntitlementGuard],
})
export class PlatformEntitlementsModule {}
