import { Injectable } from "@nestjs/common";
import { TenantEntitlementsReadPort } from "@corely/kernel";
import { TenantEntitlementsService } from "../application/tenant-entitlements.service";

@Injectable()
export class TenantEntitlementsReadAdapter implements TenantEntitlementsReadPort {
  constructor(private readonly service: TenantEntitlementsService) {}

  async getAppEnablementMap(tenantId: string): Promise<Record<string, boolean>> {
    const effective = await this.service.getEffectiveApps(tenantId);
    return effective.apps.reduce(
      (acc, app) => {
        acc[app.appId] = app.effective.visible;
        return acc;
      },
      {} as Record<string, boolean>
    );
  }

  async isAppEnabled(tenantId: string, appId: string): Promise<boolean> {
    const effective = await this.service.getEffectiveApps(tenantId);
    const app = effective.apps.find((entry) => entry.appId === appId);
    return app?.effective.visible ?? false;
  }
}
