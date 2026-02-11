import { describe, expect, it, vi, beforeEach } from "vitest";
import type { AppManifest, MenuContribution } from "@corely/contracts";
import { MenuBuilderService } from "../application/services/menu-builder.service";
import { TenantEntitlementService } from "../application/services/tenant-entitlement.service";
import { TenantEntitlement } from "../domain/entitlement.aggregate";
import type { AppRegistryPort } from "../application/ports/app-registry.port";
import type { TenantMenuOverrideRepositoryPort } from "../application/ports/tenant-menu-override-repository.port";

const createMenuItem = (overrides: Partial<MenuContribution>): MenuContribution => ({
  id: "item-1",
  scope: "web",
  section: "general",
  labelKey: "nav.item1",
  defaultLabel: "Item 1",
  route: "/item-1",
  icon: "Square",
  order: 10,
  ...overrides,
});

const createManifest = (appId: string, menu: MenuContribution[]): AppManifest => ({
  appId,
  name: appId,
  tier: 1,
  version: "1.0.0",
  dependencies: [],
  capabilities: [],
  permissions: [],
  menu,
});

describe("MenuBuilderService", () => {
  let service: MenuBuilderService;
  let appRegistry: AppRegistryPort;
  let entitlementService: TenantEntitlementService;
  let menuOverrideRepo: TenantMenuOverrideRepositoryPort;
  let manifests: Record<string, AppManifest>;

  beforeEach(() => {
    manifests = {};

    appRegistry = {
      get: vi.fn((appId: string) => manifests[appId]),
      list: vi.fn(() => Object.values(manifests)),
      findByCapability: vi.fn(() => []),
      has: vi.fn((appId: string) => Boolean(manifests[appId])),
    };

    entitlementService = {
      getTenantEntitlement: vi.fn(),
    } as unknown as TenantEntitlementService;

    menuOverrideRepo = {
      findByTenantAndScope: vi.fn(async () => null),
      upsert: vi.fn(),
      delete: vi.fn(),
    };

    service = new MenuBuilderService(appRegistry, entitlementService, menuOverrideRepo);
  });

  it("hides group when app is not enabled for tenant", async () => {
    manifests["invoices"] = createManifest("invoices", [createMenuItem({ id: "invoices" })]);
    vi.mocked(entitlementService.getTenantEntitlement).mockResolvedValue(
      new TenantEntitlement("tenant-1", new Set(), new Set())
    );

    const result = await service.build({
      tenantId: "tenant-1",
      userId: "user-1",
      permissions: new Set(["sales.invoices.read"]),
      scope: "web",
    });

    expect(result.groups).toEqual([]);
    expect(result.items).toEqual([]);
  });

  it("hides group when app has no staff web menu items", async () => {
    manifests["portal"] = createManifest("portal", []);
    vi.mocked(entitlementService.getTenantEntitlement).mockResolvedValue(
      new TenantEntitlement("tenant-1", new Set(["portal"]), new Set())
    );

    const result = await service.build({
      tenantId: "tenant-1",
      userId: "user-1",
      permissions: new Set(),
      scope: "web",
    });

    expect(result.groups).toEqual([]);
  });

  it("hides items from entitlement-disabled apps", async () => {
    manifests["core"] = createManifest("core", [
      createMenuItem({ id: "dashboard", route: "/dashboard" }),
    ]);
    manifests["expenses"] = createManifest("expenses", [
      createMenuItem({ id: "expenses", route: "/expenses" }),
    ]);
    vi.mocked(entitlementService.getTenantEntitlement).mockResolvedValue(
      new TenantEntitlement("tenant-1", new Set(["core"]), new Set())
    );

    const result = await service.build({
      tenantId: "tenant-1",
      userId: "user-1",
      permissions: new Set(),
      scope: "web",
    });

    expect(result.groups.map((group) => group.appId)).toEqual(["core"]);
    expect(result.items.map((item) => item.id)).toEqual(["dashboard"]);
  });

  it("hides items when required permissions are missing", async () => {
    manifests["classes"] = createManifest("classes", [
      createMenuItem({
        id: "classes-groups",
        route: "/class-groups",
        requiresPermissions: ["classes.read"],
      }),
    ]);
    vi.mocked(entitlementService.getTenantEntitlement).mockResolvedValue(
      new TenantEntitlement("tenant-1", new Set(["classes"]), new Set())
    );

    const result = await service.build({
      tenantId: "tenant-1",
      userId: "user-1",
      permissions: new Set(),
      scope: "web",
    });

    expect(result.groups).toEqual([]);
    expect(result.items).toEqual([]);
  });

  it("sorts settings items last within each app group", async () => {
    manifests["sales"] = createManifest("sales", [
      createMenuItem({
        id: "sales-settings",
        labelKey: "nav.salesSettings",
        defaultLabel: "Settings",
        route: "/sales/settings",
        order: 1,
      }),
      createMenuItem({
        id: "sales-home",
        labelKey: "nav.salesHome",
        defaultLabel: "Home",
        route: "/sales/home",
        order: 100,
      }),
      createMenuItem({
        id: "sales-analytics",
        labelKey: "nav.salesAnalytics",
        defaultLabel: "Analytics",
        route: "/sales/analytics",
        order: 100,
      }),
    ]);
    vi.mocked(entitlementService.getTenantEntitlement).mockResolvedValue(
      new TenantEntitlement("tenant-1", new Set(["sales"]), new Set())
    );

    const result = await service.build({
      tenantId: "tenant-1",
      userId: "user-1",
      permissions: new Set(),
      scope: "web",
    });

    expect(result.groups).toHaveLength(1);
    expect(result.groups[0].items.map((item) => item.id)).toEqual([
      "sales-analytics",
      "sales-home",
      "sales-settings",
    ]);
  });
});
