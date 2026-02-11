import { describe, expect, it, vi } from "vitest";
import { ConflictException } from "@nestjs/common";
import { TenantEntitlementsService } from "./tenant-entitlements.service";

const buildService = (params?: {
  appEntitlements?: Array<{
    appId: string;
    enabledFeatureKey: string;
    defaultEnabled: boolean;
    dependencies: string[];
  }>;
  manifests?: Array<{ appId: string; name: string; tier: number }>;
  overrides?: Array<{ featureKey: string; value: unknown }>;
  installs?: Array<{ appId: string; enabled: boolean }>;
}) => {
  const appEntitlements = params?.appEntitlements ?? [
    {
      appId: "core",
      enabledFeatureKey: "app.core.enabled",
      defaultEnabled: true,
      dependencies: [],
    },
    {
      appId: "platform",
      enabledFeatureKey: "app.platform.enabled",
      defaultEnabled: true,
      dependencies: [],
    },
    {
      appId: "expenses",
      enabledFeatureKey: "app.expenses.enabled",
      defaultEnabled: true,
      dependencies: [],
    },
  ];
  const manifests = params?.manifests ?? [
    { appId: "core", name: "Core", tier: 0 },
    { appId: "platform", name: "Platform", tier: 0 },
    { appId: "expenses", name: "Expenses", tier: 1 },
  ];
  const overrides = params?.overrides ?? [];
  const installs = params?.installs ?? [];

  const prisma = {
    tenantFeatureOverride: {
      findMany: vi.fn(async () =>
        overrides.map((override) => ({
          featureKey: override.featureKey,
          valueJson: JSON.stringify(override.value),
        }))
      ),
      upsert: vi.fn(async () => ({})),
    },
    tenantAppInstall: {
      findMany: vi.fn(async () => installs),
    },
    $transaction: vi.fn(async (callback: (tx: any) => Promise<unknown>) =>
      callback({
        tenantFeatureOverride: {
          upsert: vi.fn(async () => ({})),
        },
      })
    ),
  };

  const featureCatalog = {
    getAllFeatures: vi.fn(() => []),
    getAllAppEntitlements: vi.fn(() => appEntitlements),
    getAppEntitlementDefinition: vi.fn((appId: string) =>
      appEntitlements.find((entry) => entry.appId === appId)
    ),
  };

  const appRegistry = {
    list: vi.fn(() => manifests),
  };

  return new TenantEntitlementsService(prisma as any, featureCatalog as any, appRegistry as any);
};

describe("TenantEntitlementsService effective app resolver", () => {
  it("keeps system apps visible even when legacy/host/tenant overrides disable them", async () => {
    const service = buildService({
      overrides: [
        { featureKey: "app.core.enabled", value: false },
        { featureKey: "app.core.host.allowed", value: false },
        { featureKey: "app.core.tenant.enabled", value: false },
      ],
    });

    const result = await service.getEffectiveApps("tenant-1");
    const core = result.apps.find((app) => app.appId === "core");

    expect(core).toBeDefined();
    expect(core?.isSystem).toBe(true);
    expect(core?.effective.visible).toBe(true);
    expect(core?.blockers).toEqual([]);
    expect(core?.tenantSetting.enabled).toBe(true);
  });

  it("rejects host policy mutation for system apps", async () => {
    const service = buildService();

    await expect(
      service.updateAppPolicy("tenant-1", "core", { allowed: false }, "host-user")
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it("rejects tenant enable when host policy denies app", async () => {
    const service = buildService({
      overrides: [{ featureKey: "app.expenses.host.allowed", value: false }],
      installs: [{ appId: "expenses", enabled: true }],
    });

    await expect(
      service.updateTenantAppSetting("tenant-1", "expenses", { enabled: true }, "tenant-user")
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it("rejects tenant enable when app is not installed", async () => {
    const service = buildService({
      installs: [],
    });

    await expect(
      service.updateTenantAppSetting("tenant-1", "expenses", { enabled: true }, "tenant-user")
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it("allows tenant enable when only blocker is TENANT_DISABLED", async () => {
    const service = buildService({
      overrides: [{ featureKey: "app.expenses.tenant.enabled", value: false }],
      installs: [{ appId: "expenses", enabled: true }],
    });

    await expect(
      service.updateTenantAppSetting("tenant-1", "expenses", { enabled: true }, "tenant-user")
    ).resolves.toBeUndefined();
  });
});
