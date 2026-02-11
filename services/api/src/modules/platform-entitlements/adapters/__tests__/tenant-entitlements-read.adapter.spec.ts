import { describe, it, expect, vi, beforeEach } from "vitest";
import { TenantEntitlementsReadAdapter } from "../tenant-entitlements-read.adapter";
import { TenantEntitlementsService } from "../../application/tenant-entitlements.service";
import type { EffectiveAppsResponse } from "@corely/contracts";

describe("TenantEntitlementsReadAdapter", () => {
  let adapter: TenantEntitlementsReadAdapter;
  let mockService: TenantEntitlementsService;

  beforeEach(() => {
    mockService = {
      getEffectiveApps: vi.fn(),
    } as any;
    adapter = new TenantEntitlementsReadAdapter(mockService);
  });

  it("should map entitlement result to boolean map", async () => {
    const tenantId = "tenant-1";
    const entitlements: EffectiveAppsResponse = {
      apps: [
        {
          appId: "app-A",
          name: "App A",
          tier: 1,
          isSystem: false,
          install: { installed: true, enabled: true },
          planEntitlement: { enabled: true, source: "default" },
          hostPolicy: { allowed: true, forced: "none" },
          tenantSetting: { enabled: true, isEditable: true },
          effective: { visible: true },
          blockers: [],
        },
        {
          appId: "app-B",
          name: "App B",
          tier: 1,
          isSystem: false,
          install: { installed: true, enabled: true },
          planEntitlement: { enabled: true, source: "override" },
          hostPolicy: { allowed: true, forced: "none" },
          tenantSetting: { enabled: false, isEditable: true },
          effective: { visible: false },
          blockers: ["TENANT_DISABLED"],
        },
      ],
      generatedAt: new Date().toISOString(),
    };

    (mockService.getEffectiveApps as any).mockResolvedValue(entitlements);

    const result = await adapter.getAppEnablementMap(tenantId);

    expect(result).toEqual({
      "app-A": true,
      "app-B": false,
    });
  });

  it("should check specific app enablement", async () => {
    const tenantId = "tenant-1";
    const entitlements: EffectiveAppsResponse = {
      apps: [
        {
          appId: "app-A",
          name: "App A",
          tier: 1,
          isSystem: false,
          install: { installed: true, enabled: true },
          planEntitlement: { enabled: true, source: "default" },
          hostPolicy: { allowed: true, forced: "none" },
          tenantSetting: { enabled: true, isEditable: true },
          effective: { visible: true },
          blockers: [],
        },
      ],
      generatedAt: new Date().toISOString(),
    };

    (mockService.getEffectiveApps as any).mockResolvedValue(entitlements);

    const isEnabledA = await adapter.isAppEnabled(tenantId, "app-A");
    const isEnabledB = await adapter.isAppEnabled(tenantId, "app-B"); // Not found

    expect(isEnabledA).toBe(true);
    expect(isEnabledB).toBe(false);
  });
});
