import { randomUUID } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { Test } from "@nestjs/testing";
import type { INestApplication } from "@nestjs/common";
import request from "supertest";
import { mockDeep } from "vitest-mock-extended";
import { AUDIT_PORT } from "@corely/kernel";
import { PrismaService, PrismaAuditAdapter } from "@corely/data";
import { createSsoTestContext } from "../../identity/testkit/sso-test-context";
import { JwtTokenService } from "../../identity/infrastructure/security/jwt.token-service";
import { TOKEN_SERVICE_TOKEN } from "../../identity/application/ports/token-service.port";
import { PrismaMembershipRepository } from "../../identity/infrastructure/adapters/prisma-membership-repository.adapter";
import { PrismaRolePermissionGrantRepository } from "../../identity/infrastructure/adapters/prisma-role-permission-grant-repository.adapter";
import { GetEffectivePermissionsUseCase } from "../../identity/application/use-cases/get-effective-permissions.usecase";
import { AuthorizeRequestContextUseCase } from "../../identity/application/use-cases/authorize-request-context.usecase";
import { AuthorizeWorkspaceUseCase } from "../../workspaces/public";
import { PrismaWorkspaceRepository } from "../../workspaces/infrastructure/adapters/prisma-workspace-repository.adapter";
import { AuthGuard } from "../../identity/adapters/http/auth.guard";
import { RbacGuard } from "../../identity/adapters/http/rbac.guard";
import { DomainExceptionFilter } from "../../../shared/filters/domain-exception.filter";
import { FeatureCatalogService } from "../../platform-entitlements/application/feature-catalog.service";
import { TenantEntitlementsService } from "../../platform-entitlements/application/tenant-entitlements.service";
import { TenantEntitlementsController } from "../../platform-entitlements/http/tenant-entitlements.controller";
import { TenantEntitlementsReadAdapter } from "../../platform-entitlements/adapters/tenant-entitlements-read.adapter";
import { TenantEntitlementService } from "../application/services/tenant-entitlement.service";
import { DependencyResolverService } from "../application/services/dependency-resolver.service";
import { AppRegistry } from "../infrastructure/registries/app-registry";
import { PrismaTenantAppInstallRepositoryAdapter } from "../infrastructure/adapters/prisma-tenant-app-install-repository.adapter";
import { EnableAppUseCase } from "../application/use-cases/enable-app.usecase";
import { DisableAppUseCase } from "../application/use-cases/disable-app.usecase";
import { ListAppCatalogUseCase } from "../application/use-cases/list-app-catalog.usecase";
import { GetAppManagementLinkUseCase } from "../application/use-cases/get-app-management-link.usecase";
import { MenuController } from "../adapters/http/menu.controller";
import { ComposeMenuUseCase } from "../application/use-cases/compose-menu.usecase";
import { UpdateMenuOverridesUseCase } from "../application/use-cases/update-menu-overrides.usecase";
import { ResetMenuOverridesUseCase } from "../application/use-cases/reset-menu-overrides.usecase";
import { ListAppLaunchesUseCase } from "../application/use-cases/list-app-launches.usecase";
import { ROLE_PERMISSION_GRANT_REPOSITORY_TOKEN } from "../../identity/application/ports/role-permission-grant-repository.port";
import { PlatformController } from "../adapters/http/platform.controller";

// Guarded by the shared fixture's disposable localhost corely_384_* database check.
describe.skipIf(!process.env.SSO_TEST_DATABASE_URL)("host app configuration", () => {
  let f: Awaited<ReturnType<typeof createSsoTestContext>>;
  let app: INestApplication;
  let service: TenantEntitlementsService;
  let observer: TenantEntitlementService;
  let discover: GetAppManagementLinkUseCase;
  let grants: PrismaRolePermissionGrantRepository;
  let roleId: string;
  let hostToken: string;
  let memberToken: string;
  let enable: EnableAppUseCase;
  let registry: AppRegistry;
  let catalog: FeatureCatalogService;
  beforeEach(async () => {
    f = await createSsoTestContext();
    registry = new AppRegistry();
    const all = new AppRegistry();
    all.loadManifests();
    for (const id of ["invoices", "parties"]) {
      const manifest = all.get(id);
      if (!manifest) throw new Error(`Missing fixture manifest ${id}`);
      registry.register(manifest);
    }
    const installs = new PrismaTenantAppInstallRepositoryAdapter(f.prisma);
    const audit = new PrismaAuditAdapter(f.prisma);
    enable = new EnableAppUseCase(registry, installs, new DependencyResolverService(), audit, {
      newId: randomUUID,
    });
    catalog = new FeatureCatalogService(registry);
    catalog.compileCatalog();
    service = new TenantEntitlementsService(f.prisma, catalog, enable, audit);
    // A second process-equivalent instance must see changes without invalidation calls.
    const second = new TenantEntitlementsService(f.prisma, catalog, enable, audit);
    observer = new TenantEntitlementService(
      installs,
      registry,
      new TenantEntitlementsReadAdapter(second)
    );
    const members = new PrismaMembershipRepository(f.prisma);
    const workspaces = new AuthorizeWorkspaceUseCase(new PrismaWorkspaceRepository(f.prisma));
    grants = new PrismaRolePermissionGrantRepository(f.prisma);
    const permissions = new GetEffectivePermissionsUseCase(grants, members, workspaces);
    discover = new GetAppManagementLinkUseCase(permissions);
    const role = await f.prisma.role.create({ data: { tenantId: null, name: `Host-${f.userId}` } });
    roleId = role.id;
    await f.prisma.membership.create({ data: { tenantId: null, userId: f.userId, roleId } });
    await grants.replaceAll(null, roleId, [{ key: "*", effect: "ALLOW" }]);
    const tokens = new JwtTokenService();
    hostToken = tokens.generateAccessToken({
      userId: f.userId,
      email: f.email,
      tenantId: null,
      roleIds: [roleId],
    });
    memberToken = tokens.generateAccessToken({
      userId: f.userId,
      email: f.email,
      tenantId: f.tenantId,
      roleIds: [roleId],
    });
    const module = await Test.createTestingModule({
      controllers: [TenantEntitlementsController, PlatformController, MenuController],
      providers: [
        AuthGuard,
        RbacGuard,
        { provide: TOKEN_SERVICE_TOKEN, useValue: tokens },
        {
          provide: AuthorizeRequestContextUseCase,
          useValue: new AuthorizeRequestContextUseCase(members, workspaces),
        },
        { provide: GetEffectivePermissionsUseCase, useValue: permissions },
        TenantEntitlementsService,
        GetAppManagementLinkUseCase,
        { provide: PrismaService, useValue: f.prisma },
        { provide: FeatureCatalogService, useValue: catalog },
        { provide: AUDIT_PORT, useValue: audit },
        { provide: ComposeMenuUseCase, useValue: mockDeep<ComposeMenuUseCase>() },
        { provide: UpdateMenuOverridesUseCase, useValue: mockDeep<UpdateMenuOverridesUseCase>() },
        { provide: ResetMenuOverridesUseCase, useValue: mockDeep<ResetMenuOverridesUseCase>() },
        { provide: ListAppLaunchesUseCase, useValue: mockDeep<ListAppLaunchesUseCase>() },
        { provide: ROLE_PERMISSION_GRANT_REPOSITORY_TOKEN, useValue: grants },
        { provide: EnableAppUseCase, useValue: enable },
        { provide: DisableAppUseCase, useValue: mockDeep<DisableAppUseCase>() },
        {
          provide: ListAppCatalogUseCase,
          useValue: new ListAppCatalogUseCase(registry, installs, {}),
        },
      ],
    }).compile();
    service = module.get(TenantEntitlementsService);
    discover = module.get(GetAppManagementLinkUseCase);
    app = module.createNestApplication({ logger: false });
    app.useGlobalFilters(new DomainExceptionFilter());
    await app.init();
  });
  afterEach(async () => {
    if (!f) return;
    // The shared fixture owns this client and must clean records before closing its pool.
    const shutdown = f.prisma.onModuleDestroy.bind(f.prisma);
    f.prisma.onModuleDestroy = async () => {};
    try {
      await app?.close();
    } finally {
      f.prisma.onModuleDestroy = shutdown;
    }
    await f.prisma.tenantFeatureOverride.deleteMany({ where: { tenantId: f.tenantId } });
    await f.prisma.membership.deleteMany({ where: { tenantId: null, userId: f.userId } });
    await f.prisma.role.deleteMany({ where: { id: roleId } });
    await f.cleanup();
  });
  const patch = (token: string, tenant: string, appId: string, body: unknown) =>
    request(app.getHttpServer())
      .patch(`/platform/tenants/${tenant}/apps/${appId}`)
      .set("Authorization", `Bearer ${token}`)
      .send(body);

  it("enables Invoice and dependencies with installs and audit, then denies stale access on another instance", async () => {
    expect(await observer.isAppEnabled(f.tenantId, "invoices")).toBe(false);
    await patch(hostToken, f.tenantId, "invoices", { enabled: true }).expect(200);
    expect(await observer.isAppEnabled(f.tenantId, "invoices")).toBe(true);
    expect(await observer.isAppEnabled(f.tenantId, "parties")).toBe(true);
    expect(
      await f.prisma.auditLog.count({
        where: { tenantId: f.tenantId, action: "platform.app.enabled", entityId: "invoices" },
      })
    ).toBe(1);
    const conflict = await patch(hostToken, f.tenantId, "parties", { enabled: false }).expect(409);
    expect(conflict.body.dependents).toEqual(["invoices"]);
    expect(await observer.isAppEnabled(f.tenantId, "parties")).toBe(true);
    await patch(hostToken, f.tenantId, "invoices", { enabled: false }).expect(200);
    await expect(observer.assertAppEnabled(f.tenantId, "invoices")).rejects.toThrow();
    expect(
      await f.prisma.auditLog.count({
        where: { tenantId: f.tenantId, action: "platform.app.disabled", entityId: "invoices" },
      })
    ).toBe(1);
  });
  it("returns install state for the selected tenant without changing host authority", async () => {
    const path = `/platform/apps?forTenantId=${encodeURIComponent(f.tenantId)}`;
    const initial = await request(app.getHttpServer())
      .get(path)
      .set("Authorization", `Bearer ${hostToken}`)
      .expect(200);
    expect(
      initial.body.find((entry: { appId: string }) => entry.appId === "invoices").enabled
    ).toBe(false);
    const flags = await service.getEntitlements(f.tenantId);
    expect(flags.apps.find((entry) => entry.appId === "invoices")?.enabled).toBe(true);
    await patch(hostToken, f.tenantId, "invoices", { enabled: true }).expect(200);
    const installed = await request(app.getHttpServer())
      .get(path)
      .set("Authorization", `Bearer ${hostToken}`)
      .expect(200);
    expect(
      installed.body.find((entry: { appId: string }) => entry.appId === "invoices").enabled
    ).toBe(true);
    const legacy = await request(app.getHttpServer())
      .get("/platform/apps")
      .set("Authorization", `Bearer ${hostToken}`)
      .expect(200);
    expect(legacy.body.every((entry: { enabled: boolean }) => !entry.enabled)).toBe(true);
    const other = await request(app.getHttpServer())
      .get("/platform/apps?forTenantId=other-team")
      .set("Authorization", `Bearer ${hostToken}`)
      .expect(200);
    expect(other.body.every((entry: { enabled: boolean }) => !entry.enabled)).toBe(true);
    await request(app.getHttpServer())
      .get(path)
      .set("Authorization", `Bearer ${memberToken}`)
      .expect(403);
    await request(app.getHttpServer())
      .get("/platform/apps?forTenantId=a&forTenantId=b")
      .set("Authorization", `Bearer ${hostToken}`)
      .expect(400);
  });
  it("requires renewed approval before disabling a newly added dependent app", async () => {
    await patch(hostToken, f.tenantId, "invoices", { enabled: true }).expect(200);
    const initial = await patch(hostToken, f.tenantId, "parties", { enabled: false }).expect(409);
    expect(initial.body.dependents).toEqual(["invoices"]);
    const invoice = registry.get("invoices");
    if (!invoice) throw new Error("Missing fixture app");
    registry.register({
      ...invoice,
      appId: "synthetic-dependent",
      name: "Synthetic dependent",
      launch: undefined,
      menu: [],
      entitlement: { enabledFeatureKey: "app.synthetic-dependent.enabled", defaultEnabled: false },
    });
    catalog.compileCatalog();
    await patch(hostToken, f.tenantId, "synthetic-dependent", { enabled: true }).expect(200);
    const stale = await patch(hostToken, f.tenantId, "parties", {
      enabled: false,
      cascade: true,
      expectedDependents: ["invoices"],
    }).expect(409);
    expect(stale.body.approvalChanged).toBe(true);
    expect(stale.body.dependents).toEqual(
      expect.arrayContaining(["invoices", "synthetic-dependent"])
    );
    expect(await observer.isAppEnabled(f.tenantId, "invoices")).toBe(true);
    expect(await observer.isAppEnabled(f.tenantId, "synthetic-dependent")).toBe(true);
    expect(
      await f.prisma.auditLog.count({
        where: { tenantId: f.tenantId, action: "platform.app.disabled" },
      })
    ).toBe(0);
    await patch(hostToken, f.tenantId, "parties", {
      enabled: false,
      cascade: true,
      expectedDependents: stale.body.dependents,
    }).expect(200);
    expect(await observer.isAppEnabled(f.tenantId, "invoices")).toBe(false);
    expect(await observer.isAppEnabled(f.tenantId, "synthetic-dependent")).toBe(false);
    // Existing callers may still explicitly cascade without a preview snapshot.
    await patch(hostToken, f.tenantId, "invoices", { enabled: true }).expect(200);
    await patch(hostToken, f.tenantId, "parties", { enabled: false, cascade: true }).expect(200);
    expect(await observer.isAppEnabled(f.tenantId, "invoices")).toBe(false);
  });
  it("can disable a default-entitled app without creating installation records", async () => {
    await patch(hostToken, f.tenantId, "invoices", { enabled: false }).expect(200);
    expect(
      (await service.getEntitlements(f.tenantId)).apps.find((entry) => entry.appId === "invoices")
        ?.enabled
    ).toBe(false);
    expect(await f.prisma.tenantAppInstall.count({ where: { tenantId: f.tenantId } })).toBe(0);
  });
  it("rejects tenant users, forged role IDs, revoked host grants and malformed commands", async () => {
    await grants.replaceAll(f.tenantId, f.membership.roleId, [{ key: "*", effect: "ALLOW" }]);
    await patch(memberToken, f.tenantId, "invoices", { enabled: true }).expect(403);
    await request(app.getHttpServer())
      .post("/platform/apps/invoices/enable")
      .set("Authorization", `Bearer ${memberToken}`)
      .expect(403);
    await patch(hostToken, f.tenantId, "invoices", { enabled: "false" }).expect(400);
    await patch(hostToken, f.tenantId, "invoices", {
      enabled: false,
      cascade: true,
      expectedDependents: "invoices",
    }).expect(400);
    await grants.replaceAll(null, roleId, []);
    await patch(hostToken, f.tenantId, "invoices", { enabled: true }).expect(403);
    expect(await f.prisma.tenantAppInstall.count({ where: { tenantId: f.tenantId } })).toBe(0);
  });
  it("returns only a management link to eligible host admins and withdraws it after revocation", async () => {
    await request(app.getHttpServer())
      .get("/menu/app-management")
      .set("Authorization", `Bearer ${memberToken}`)
      .expect(200, { path: `/settings/tenants/${f.tenantId}` });
    expect(await discover.execute(f.tenantId, f.userId)).toEqual({
      path: `/settings/tenants/${f.tenantId}`,
    });
    await grants.replaceAll(null, roleId, []);
    expect(await discover.execute(f.tenantId, f.userId)).toEqual({});
    await request(app.getHttpServer())
      .get("/menu/app-management")
      .set("Authorization", `Bearer ${memberToken}`)
      .expect(200, {});
  });
  it("rolls back installs, overrides and audit when a configuration write fails", async () => {
    const original = enable.execute.bind(enable);
    // Failure after the real installer has written through the caller's transaction.
    enable.execute = async (input, tx) => {
      await original(input, tx);
      throw new Error("Synthetic configuration failure");
    };
    await expect(
      service.updateAppEnablement(f.tenantId, "invoices", true, f.userId)
    ).rejects.toThrow("Synthetic configuration failure");
    expect(await f.prisma.tenantAppInstall.count({ where: { tenantId: f.tenantId } })).toBe(0);
    expect(await f.prisma.tenantFeatureOverride.count({ where: { tenantId: f.tenantId } })).toBe(0);
    expect(
      await f.prisma.auditLog.count({
        where: { tenantId: f.tenantId, action: "platform.app.enabled" },
      })
    ).toBe(0);
  });
});
