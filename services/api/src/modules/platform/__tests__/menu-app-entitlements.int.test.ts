import { Test, type TestingModule } from "@nestjs/testing";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { INestApplication } from "@nestjs/common";
import request from "supertest";
import { randomUUID } from "crypto";
import { DataModule, PrismaService } from "@corely/data";
import { PlatformModule } from "../platform.module";
import { PlatformEntitlementsModule } from "../../platform-entitlements/platform-entitlements.module";
import { IdentityModule } from "../../identity/identity.module";
import { TenantEntitlementsService } from "../../platform-entitlements/application/tenant-entitlements.service";
import { FeatureCatalogService } from "../../platform-entitlements/application/feature-catalog.service";
import { AppRegistry } from "../infrastructure/registries/app-registry";
import {
  TENANT_APP_INSTALL_REPOSITORY_TOKEN,
  type TenantAppInstallRepositoryPort,
} from "../application/ports/tenant-app-install-repository.port";

const TEST_APP_CORE_ID = "core";
const TEST_APP_EXPENSES_ID = "expenses";
const TEST_APP_TAX_ID = "tax";
const TEST_MENU_DASHBOARD_ID = "dashboard";
const TEST_MENU_EXPENSES_ID = "expenses";
const TEST_MENU_TAX_OVERVIEW_ID = "tax-center";

interface MenuGroupResponse {
  appId: string;
  items: Array<{ id: string }>;
}

describe("Menu app entitlements integration", () => {
  let moduleRef: TestingModule;
  let app: INestApplication;
  let server: ReturnType<INestApplication["getHttpServer"]>;
  let prisma: PrismaService;
  let entitlementsService: TenantEntitlementsService;
  let featureCatalog: FeatureCatalogService;
  let appRegistry: AppRegistry;
  let appInstallRepo: TenantAppInstallRepositoryPort;

  const tenantId = `menu-int-tenant-${randomUUID()}`;
  const userId = "menu-int-user";

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [DataModule, PlatformModule, PlatformEntitlementsModule, IdentityModule],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
    server = app.getHttpServer();

    prisma = moduleRef.get<PrismaService>(PrismaService);
    entitlementsService = moduleRef.get<TenantEntitlementsService>(TenantEntitlementsService);
    featureCatalog = moduleRef.get<FeatureCatalogService>(FeatureCatalogService);
    appRegistry = moduleRef.get<AppRegistry>(AppRegistry);
    appInstallRepo = moduleRef.get<TenantAppInstallRepositoryPort>(
      TENANT_APP_INSTALL_REPOSITORY_TOKEN
    );

    appRegistry.loadManifests();
    featureCatalog.compileCatalog();

    await prisma.tenant.create({
      data: {
        id: tenantId,
        name: "Menu Integration Tenant",
        slug: `menu-int-${randomUUID().slice(0, 8)}`,
      },
    });

    await appInstallRepo.upsert({
      id: randomUUID(),
      tenantId,
      appId: TEST_APP_CORE_ID,
      enabled: true,
      installedVersion: "1.0.0",
      enabledAt: new Date(),
      enabledByUserId: userId,
    });

    await appInstallRepo.upsert({
      id: randomUUID(),
      tenantId,
      appId: TEST_APP_EXPENSES_ID,
      enabled: true,
      installedVersion: "1.0.0",
      enabledAt: new Date(),
      enabledByUserId: userId,
    });

    await appInstallRepo.upsert({
      id: randomUUID(),
      tenantId,
      appId: TEST_APP_TAX_ID,
      enabled: true,
      installedVersion: "2.0.0",
      enabledAt: new Date(),
      enabledByUserId: userId,
    });
  });

  afterAll(async () => {
    await prisma.tenantFeatureOverride.deleteMany({ where: { tenantId } });
    await prisma.tenantAppInstall.deleteMany({ where: { tenantId } });
    await prisma.tenantMenuOverride.deleteMany({ where: { tenantId } });
    await prisma.tenant.deleteMany({ where: { id: tenantId } });

    if (app) {
      await app.close();
    } else if (moduleRef) {
      await moduleRef.close();
    }
  });

  it("includes menu items from apps enabled for the tenant", async () => {
    const response = await request(server)
      .get("/menu?scope=web")
      .set("x-user-id", userId)
      .set("x-tenant-id", tenantId);

    expect(response.status).toBe(200);
    const ids = new Set<string>(response.body.items.map((item: { id: string }) => item.id));
    const groupIds = new Set<string>(
      response.body.groups.map((group: MenuGroupResponse) => group.appId)
    );
    expect(ids.has(TEST_MENU_DASHBOARD_ID)).toBe(true);
    expect(ids.has(TEST_MENU_EXPENSES_ID)).toBe(true);
    expect(ids.has(TEST_MENU_TAX_OVERVIEW_ID)).toBe(true);
    expect(groupIds.has(TEST_APP_CORE_ID)).toBe(true);
    expect(groupIds.has(TEST_APP_EXPENSES_ID)).toBe(true);
    expect(groupIds.has(TEST_APP_TAX_ID)).toBe(true);
  });

  it("removes menu items when an app is disabled and restores them after re-enable", async () => {
    await entitlementsService.updateAppEnablement(tenantId, TEST_APP_TAX_ID, false, userId, false);

    const disabled = await request(server)
      .get("/menu?scope=web")
      .set("x-user-id", userId)
      .set("x-tenant-id", tenantId);
    expect(disabled.status).toBe(200);
    const disabledIds = new Set<string>(disabled.body.items.map((item: { id: string }) => item.id));
    const disabledGroupIds = new Set<string>(
      disabled.body.groups.map((group: MenuGroupResponse) => group.appId)
    );
    expect(disabledIds.has(TEST_MENU_TAX_OVERVIEW_ID)).toBe(false);
    expect(disabledIds.has(TEST_MENU_EXPENSES_ID)).toBe(true);
    expect(disabledIds.has(TEST_MENU_DASHBOARD_ID)).toBe(true);
    expect(disabledGroupIds.has(TEST_APP_TAX_ID)).toBe(false);

    await entitlementsService.updateAppEnablement(tenantId, TEST_APP_TAX_ID, true, userId, false);

    const reenabled = await request(server)
      .get("/menu?scope=web")
      .set("x-user-id", userId)
      .set("x-tenant-id", tenantId);
    expect(reenabled.status).toBe(200);
    const reenabledIds = new Set<string>(
      reenabled.body.items.map((item: { id: string }) => item.id)
    );
    expect(reenabledIds.has(TEST_MENU_TAX_OVERVIEW_ID)).toBe(true);
    expect(reenabledIds.has(TEST_MENU_EXPENSES_ID)).toBe(true);
    expect(reenabledIds.has(TEST_MENU_DASHBOARD_ID)).toBe(true);

    const taxGroup = reenabled.body.groups.find(
      (group: MenuGroupResponse) => group.appId === "tax"
    );
    expect(taxGroup).toBeDefined();
    expect(taxGroup!.items[taxGroup!.items.length - 1].id).toBe("tax-settings");
  });
});
