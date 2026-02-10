import { Module, forwardRef } from "@nestjs/common";
import { DataModule } from "@corely/data";
import { TENANT_ENTITLEMENTS_READ_PORT_TOKEN } from "@corely/kernel";
import { IdentityModule } from "../identity";
import { PlatformModule } from "../platform/platform.module";
import { FeatureCatalogService } from "./application/feature-catalog.service";
import { TenantEntitlementsService } from "./application/tenant-entitlements.service";
import { TenantEntitlementsController } from "./http/tenant-entitlements.controller";
import { PlatformEntitlementGuard } from "./http/entitlement.guard";
import { TenantEntitlementsReadAdapter } from "./adapters/tenant-entitlements-read.adapter";

@Module({
  imports: [DataModule, forwardRef(() => PlatformModule), IdentityModule],
  controllers: [TenantEntitlementsController],
  providers: [
    FeatureCatalogService,
    TenantEntitlementsService,
    PlatformEntitlementGuard,
    TenantEntitlementsReadAdapter,
    {
      provide: TENANT_ENTITLEMENTS_READ_PORT_TOKEN,
      useExisting: TenantEntitlementsReadAdapter,
    },
  ],
  exports: [
    TenantEntitlementsService,
    FeatureCatalogService,
    PlatformEntitlementGuard,
    TENANT_ENTITLEMENTS_READ_PORT_TOKEN,
  ],
})
export class PlatformEntitlementsModule {}
