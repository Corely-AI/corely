import { Test, TestingModule } from "@nestjs/testing";
import { PlatformModule } from "../platform.module";
import { PlatformEntitlementsModule } from "../../platform-entitlements/platform-entitlements.module";
import { DataModule, PrismaService } from "@corely/data";
import { IdentityModule } from "../../identity/identity.module";
import { TenantEntitlementService } from "../application/services/tenant-entitlement.service";
import { TenantEntitlementsService } from "../../platform-entitlements/application/tenant-entitlements.service";
import { APP_REGISTRY_TOKEN } from "../application/ports/app-registry.port";
import { TENANT_APP_INSTALL_REPOSITORY_TOKEN } from "../application/ports/tenant-app-install-repository.port";
import { randomUUID } from "crypto";
import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";

describe("Tenant Entitlement Integration", () => {
  let moduleRef: TestingModule;
  let prisma: PrismaService;
  let platformService: TenantEntitlementService;
  let entitlementsService: TenantEntitlementsService;
  let appInstallRepo: any;

  const TEST_TENANT_ID = `test_tenant_${randomUUID()}`;
  const TEST_APP_ID = "integration-test-app";

  const mockAppRegistry = {
    loadManifests: vi.fn(),
    list: vi.fn().mockReturnValue([
      {
        appId: TEST_APP_ID,
        name: "Integration Test App",
        version: "1.0.0",
        features: [],
        entitlement: {
          enabledFeatureKey: `app.${TEST_APP_ID}.enabled`,
          defaultEnabled: true,
        },
        dependencies: [],
        capabilities: [],
      },
    ]),
    get: vi.fn().mockImplementation((id) => {
      if (id === TEST_APP_ID) {
        return {
          appId: TEST_APP_ID,
          capabilities: [],
          dependencies: [],
        };
      }
      return undefined;
    }),
  };

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [DataModule, PlatformModule, PlatformEntitlementsModule, IdentityModule],
    })
      .overrideProvider(APP_REGISTRY_TOKEN)
      .useValue(mockAppRegistry)
      .compile();

    prisma = moduleRef.get<PrismaService>(PrismaService);
    platformService = moduleRef.get<TenantEntitlementService>(TenantEntitlementService);
    entitlementsService = moduleRef.get<TenantEntitlementsService>(TenantEntitlementsService);
    appInstallRepo = moduleRef.get(TENANT_APP_INSTALL_REPOSITORY_TOKEN);

    // Initialize module (triggers FeatureCatalog to load from mock registry)
    await moduleRef.init();

    // Create test tenant
    await prisma.tenant.create({
      data: {
        id: TEST_TENANT_ID,
        name: "Test Tenant",
        slug: `test-tenant-${randomUUID()}`,
      },
    });
  });

  afterAll(async () => {
    // Cleanup
    await prisma.tenantFeatureOverride.deleteMany({
      where: {
        tenantId: TEST_TENANT_ID,
      },
    });
    await prisma.tenant.delete({
      where: {
        id: TEST_TENANT_ID,
      },
    });
    await moduleRef.close();
  });

  it("should respect host-side disable toggle even if app is installed", async () => {
    // 1. Install the app
    await appInstallRepo.upsert({
      id: randomUUID(),
      tenantId: TEST_TENANT_ID,
      appId: TEST_APP_ID,
      enabled: true,
      installedVersion: "1.0.0",
      enabledAt: new Date(),
      enabledByUserId: "test-user",
    });

    // 2. Verify enabled by default (since defaultEnabled=true in mock and installed)
    let entitlement = await platformService.getTenantEntitlement(TEST_TENANT_ID);
    expect(entitlement.isAppEnabled(TEST_APP_ID)).toBe(true);

    // 3. Disable via Platform Entitlements (Host side)
    await entitlementsService.updateAppEnablement(
      TEST_TENANT_ID,
      TEST_APP_ID,
      false,
      "host-admin",
      false
    );

    // 4. Verify disabled in Platform Service
    entitlement = await platformService.getTenantEntitlement(TEST_TENANT_ID);
    expect(entitlement.isAppEnabled(TEST_APP_ID)).toBe(false);

    // 5. Re-enable
    await entitlementsService.updateAppEnablement(
      TEST_TENANT_ID,
      TEST_APP_ID,
      true,
      "host-admin",
      false
    );

    // 6. Verify enabled again
    entitlement = await platformService.getTenantEntitlement(TEST_TENANT_ID);
    expect(entitlement.isAppEnabled(TEST_APP_ID)).toBe(true);
  });
});
