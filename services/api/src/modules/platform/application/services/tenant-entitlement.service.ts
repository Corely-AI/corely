import { Inject, Injectable } from "@nestjs/common";
import { ForbiddenError, TENANT_ENTITLEMENTS_READ_PORT_TOKEN } from "@corely/kernel";
import type { TenantEntitlementsReadPort } from "@corely/kernel";
import { TenantEntitlement } from "../../domain/entitlement.aggregate";
import { APP_REGISTRY_TOKEN, type AppRegistryPort } from "../ports/app-registry.port";

/**
 * Tenant Entitlement Service
 * Resolves and enforces tenant-level entitlements based on enabled apps
 */
@Injectable()
export class TenantEntitlementService {
  constructor(
    @Inject(APP_REGISTRY_TOKEN)
    private readonly appRegistry: AppRegistryPort,
    @Inject(TENANT_ENTITLEMENTS_READ_PORT_TOKEN)
    private readonly entitlementsReadPort: TenantEntitlementsReadPort
  ) {}

  /**
   * Get tenant entitlement (enabled apps + capabilities)
   */
  async getTenantEntitlement(tenantId: string): Promise<TenantEntitlement> {
    // Fetch effective enablement from platform-entitlements.
    // This already applies install state, host policy, tenant setting, and system app invariants.
    const enablementMap = await this.entitlementsReadPort.getAppEnablementMap(tenantId);

    const enabledAppIds = Object.entries(enablementMap)
      .filter(([, enabled]) => enabled)
      .map(([appId]) => appId);

    return TenantEntitlement.fromEnabledApps(tenantId, enabledAppIds, this.appRegistry);
  }

  /**
   * Assert that an app is enabled for a tenant
   * @throws ForbiddenError if app is not enabled
   */
  async assertAppEnabled(tenantId: string, appId: string): Promise<void> {
    const entitlement = await this.getTenantEntitlement(tenantId);
    if (!entitlement.isAppEnabled(appId)) {
      throw new ForbiddenError(`App "${appId}" is not enabled for this tenant`, {
        code: "Platform:AppNotEnabled",
      });
    }
  }

  /**
   * Assert that tenant has a capability
   * @throws ForbiddenError if capability is not available
   */
  async assertCapability(tenantId: string, capability: string): Promise<void> {
    const entitlement = await this.getTenantEntitlement(tenantId);
    if (!entitlement.hasCapability(capability)) {
      throw new ForbiddenError(`Capability "${capability}" is not available for this tenant`, {
        code: "Platform:CapabilityNotAvailable",
      });
    }
  }

  /**
   * Check if an app is enabled (without throwing)
   */
  async isAppEnabled(tenantId: string, appId: string): Promise<boolean> {
    const entitlement = await this.getTenantEntitlement(tenantId);
    return entitlement.isAppEnabled(appId);
  }

  /**
   * Check if tenant has a capability (without throwing)
   */
  async hasCapability(tenantId: string, capability: string): Promise<boolean> {
    const entitlement = await this.getTenantEntitlement(tenantId);
    return entitlement.hasCapability(capability);
  }
}
