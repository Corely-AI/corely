import { describe, it, expect, vi, beforeEach } from "vitest";
import { TenantEntitlementService } from "../application/services/tenant-entitlement.service";
import { TenantAppInstallRepositoryPort } from "../application/ports/tenant-app-install-repository.port";
import { AppRegistryPort } from "../application/ports/app-registry.port";
import { TenantEntitlementsReadPort } from "@corely/kernel";

describe("TenantEntitlementService", () => {
  let service: TenantEntitlementService;
  let mockAppInstallRepo: TenantAppInstallRepositoryPort;
  let mockAppRegistry: AppRegistryPort;
  let mockEntitlementsReadPort: TenantEntitlementsReadPort;

  beforeEach(() => {
    mockAppInstallRepo = {
      listEnabledByTenant: vi.fn(),
    } as any;
    mockAppRegistry = {
      get: vi.fn(),
    } as any;
    mockEntitlementsReadPort = {
      getAppEnablementMap: vi.fn(),
      isAppEnabled: vi.fn(),
    };

    service = new TenantEntitlementService(
      mockAppInstallRepo,
      mockAppRegistry,
      mockEntitlementsReadPort
    );
  });

  it("should filter out disabled apps from entitlement", async () => {
    const tenantId = "tenant-1";
    const installedApps = [
      { appId: "app-A", enabled: true },
      { appId: "app-B", enabled: true },
    ];
    const enablementMap = {
      "app-A": true,
      "app-B": false, // explicitly disabled via override
    };

    (mockAppInstallRepo.listEnabledByTenant as any).mockResolvedValue(installedApps);
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
    const installedApps = [{ appId: "app-A", enabled: true }];
    const enablementMap = {
      "app-A": true,
    };

    (mockAppInstallRepo.listEnabledByTenant as any).mockResolvedValue(installedApps);
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
