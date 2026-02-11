import { describe, it, expect, vi, beforeEach } from "vitest";
import { TenantEntitlementService } from "../application/services/tenant-entitlement.service";
import { AppRegistryPort } from "../application/ports/app-registry.port";
import { TenantEntitlementsReadPort } from "@corely/kernel";

describe("TenantEntitlementService", () => {
  let service: TenantEntitlementService;
  let mockAppRegistry: AppRegistryPort;
  let mockEntitlementsReadPort: TenantEntitlementsReadPort;

  beforeEach(() => {
    mockAppRegistry = {
      get: vi.fn(),
    } as any;
    mockEntitlementsReadPort = {
      getAppEnablementMap: vi.fn(),
      isAppEnabled: vi.fn(),
    };

    service = new TenantEntitlementService(mockAppRegistry, mockEntitlementsReadPort);
  });

  it("should include only effectively enabled apps from resolver map", async () => {
    const tenantId = "tenant-1";
    const enablementMap = {
      "app-A": true,
      "app-B": false, // explicitly disabled via override
    };

    (mockEntitlementsReadPort.getAppEnablementMap as any).mockResolvedValue(enablementMap);
    (mockAppRegistry.get as any).mockImplementation((id: string) => ({
      appId: id,
      capabilities: [],
      dependencies: [],
    }));

    const entitlement = await service.getTenantEntitlement(tenantId);

    expect(entitlement.isAppEnabled("app-A")).toBe(true);
    expect(entitlement.isAppEnabled("app-B")).toBe(false);
    expect(entitlement.getEnabledApps()).toEqual(["app-A"]);
  });

  it("should include app if enabled in overrides", async () => {
    const tenantId = "tenant-1";
    const enablementMap = {
      "app-A": true,
    };

    (mockEntitlementsReadPort.getAppEnablementMap as any).mockResolvedValue(enablementMap);
    (mockAppRegistry.get as any).mockImplementation((id: string) => ({
      appId: id,
      capabilities: [],
      dependencies: [],
    }));

    const entitlement = await service.getTenantEntitlement(tenantId);

    expect(entitlement.isAppEnabled("app-A")).toBe(true);
  });
});
