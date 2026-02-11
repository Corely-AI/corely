import { describe, it, expect, vi, beforeEach } from "vitest";
import { TenantEntitlementsReadAdapter } from "../tenant-entitlements-read.adapter";
import { TenantEntitlementsService } from "../../application/tenant-entitlements.service";
import { TenantEntitlements } from "../../domain/entitlement.types";

describe("TenantEntitlementsReadAdapter", () => {
  let adapter: TenantEntitlementsReadAdapter;
  let mockService: TenantEntitlementsService;

  beforeEach(() => {
    mockService = {
      getEntitlements: vi.fn(),
    } as any;
    adapter = new TenantEntitlementsReadAdapter(mockService);
  });

  it("should map entitlement result to boolean map", async () => {
    const tenantId = "tenant-1";
    const entitlements: TenantEntitlements = {
      apps: [
        { appId: "app-A", enabled: true, source: "default", dependencies: [] },
        { appId: "app-B", enabled: false, source: "tenantOverride", dependencies: [] },
      ],
      features: [],
      generatedAt: new Date().toISOString(),
    };

    (mockService.getEntitlements as any).mockResolvedValue(entitlements);

    const result = await adapter.getAppEnablementMap(tenantId);

    expect(result).toEqual({
      "app-A": true,
      "app-B": false,
    });
  });

  it("should check specific app enablement", async () => {
    const tenantId = "tenant-1";
    const entitlements: TenantEntitlements = {
      apps: [{ appId: "app-A", enabled: true, source: "default", dependencies: [] }],
      features: [],
      generatedAt: new Date().toISOString(),
    };

    (mockService.getEntitlements as any).mockResolvedValue(entitlements);

    const isEnabledA = await adapter.isAppEnabled(tenantId, "app-A");
    const isEnabledB = await adapter.isAppEnabled(tenantId, "app-B"); // Not found

    expect(isEnabledA).toBe(true);
    expect(isEnabledB).toBe(false);
  });
});
