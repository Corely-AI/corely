import { Injectable } from "@nestjs/common";
import { TenantEntitlementsReadPort } from "@corely/kernel";
import { TenantEntitlementsService } from "../application/tenant-entitlements.service";

@Injectable()
export class TenantEntitlementsReadAdapter implements TenantEntitlementsReadPort {
  constructor(private readonly service: TenantEntitlementsService) {}

  async getAppEnablementMap(tenantId: string): Promise<Record<string, boolean>> {
    const entitlements = await this.service.getEntitlements(tenantId);

    // Convert ResolvedAppEntitlement[] to Record<string, boolean>
    return entitlements.apps.reduce(
      (acc, app) => {
        acc[app.appId] = app.enabled;
        return acc;
      },
      {} as Record<string, boolean>
    );
  }

  async isAppEnabled(tenantId: string, appId: string): Promise<boolean> {
    const entitlements = await this.service.getEntitlements(tenantId);
    const app = entitlements.apps.find((a) => a.appId === appId);
    return app?.enabled ?? false;
  }
}
