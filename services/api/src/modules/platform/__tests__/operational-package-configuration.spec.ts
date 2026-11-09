import { mockDeep } from "vitest-mock-extended";
import type { AuditPort } from "@corely/kernel";
import { EnableAppUseCase } from "../application/use-cases/enable-app.usecase";
import { describe, expect, it, vi } from "vitest";
import { ForbiddenException } from "@nestjs/common";
import { PrismaService } from "@corely/data";
import {
  GetWorkspaceConfigQuerySchema,
  OpenBukBookingEnabledKey,
  WorkspaceConfigSchema,
  type AppManifest,
  type WorkspaceMembershipRole,
} from "@corely/contracts";
import { AppRegistry } from "../infrastructure/registries/app-registry";
import type { AppRegistryPort } from "../application/ports/app-registry.port";
import type {
  TenantAppInstallEntity,
  TenantAppInstallRepositoryPort,
} from "../application/ports/tenant-app-install-repository.port";
import type { TenantMenuOverrideRepositoryPort } from "../application/ports/tenant-menu-override-repository.port";
import type { WorkspaceRepositoryPort } from "../../workspaces/application/ports/workspace-repository.port";
import type { Workspace } from "../../workspaces/domain/workspace.entity";
import type { BillingAccessPort } from "../../billing";
import { FeatureCatalogService } from "../../platform-entitlements/application/feature-catalog.service";
import { TenantEntitlementsService } from "../../platform-entitlements";
import { TenantEntitlementsReadAdapter } from "../../platform-entitlements/adapters/tenant-entitlements-read.adapter";
import { TenantEntitlementService } from "../application/services/tenant-entitlement.service";
import { WorkspaceTemplateService } from "../application/services/workspace-template.service";
import { WorkspaceExperienceResolverService } from "../application/services/workspace-experience-resolver.service";
import { OperationalPackageService } from "../application/services/operational-package.service";
import { DependencyResolverService } from "../application/services/dependency-resolver.service";
import { MenuBuilderService } from "../application/services/menu-builder.service";
import { MenuComposerService } from "../application/services/menu-composer.service";
import { DisableAppUseCase } from "../application/use-cases/disable-app.usecase";
import {
  GetWorkspaceConfigUseCase,
  type GetWorkspaceConfigInput,
} from "../application/use-cases/get-workspace-config.usecase";

const now = new Date("2026-11-07T12:00:00Z");

function fixture() {
  const source = new AppRegistry();
  source.loadManifests();
  const manifests = new Map(source.list().map((manifest) => [manifest.appId, manifest]));
  const registry: AppRegistryPort = {
    get: (appId) => manifests.get(appId),
    list: () => [...manifests.values()],
    has: (appId) => manifests.has(appId),
    findByCapability: (key) =>
      [...manifests.values()].filter((app) => app.capabilities.includes(key)),
  };
  const installs = new Map<string, TenantAppInstallEntity>();
  const install = (appId: string, enabled = true) => {
    installs.set(appId, {
      id: appId,
      tenantId: "tenant-a",
      appId,
      enabled,
      installedVersion: "1.0.0",
      configJson: '{"preserved":true}',
      createdAt: now,
      updatedAt: now,
    });
  };
  install("booking");
  const repo: TenantAppInstallRepositoryPort = {
    findByTenantAndApp: vi.fn(async (tenantId, appId) =>
      tenantId === "tenant-a" ? (installs.get(appId) ?? null) : null
    ),
    listByTenant: vi.fn(async (tenantId) =>
      tenantId === "tenant-a" ? [...installs.values()] : []
    ),
    listEnabledByTenant: vi.fn(async (tenantId) =>
      tenantId === "tenant-a" ? [...installs.values()].filter((item) => item.enabled) : []
    ),
    upsert: vi.fn(async (data) => {
      const value = { ...data, createdAt: now, updatedAt: now };
      installs.set(data.appId, value);
      return value;
    }),
    update: vi.fn(async (id, data) => {
      const old = installs.get(id);
      if (!old) {
        throw new Error("Missing fixture install");
      }
      const value = { ...old, ...data };
      installs.set(id, value);
      return value;
    }),
    delete: vi.fn(async () => {
      throw new Error("Configuration must not delete records");
    }),
  };
  const overrides = new Map<string, unknown>();
  const prisma = {
    tenantFeatureOverride: {
      findMany: vi.fn(async ({ where }: { where: { tenantId: string } }) =>
        where.tenantId === "tenant-a"
          ? [...overrides].map(([featureKey, value]) => ({
              featureKey,
              valueJson: JSON.stringify(value),
            }))
          : []
      ),
    },
  } as unknown as PrismaService;
  // No paid subscription, customer invoices or finance entitlement is provided.
  const billing = {
    getAllPlanFeatureValues: vi.fn(async () => ({})),
  } as unknown as BillingAccessPort;
  const catalog = new FeatureCatalogService(registry);
  catalog.compileCatalog();
  const entitlements = new TenantEntitlementsService(
    prisma,
    catalog,
    mockDeep<EnableAppUseCase>(),
    mockDeep<AuditPort>(),
    billing
  );
  const entitlementService = new TenantEntitlementService(
    repo,
    registry,
    new TenantEntitlementsReadAdapter(entitlements)
  );
  const template = new WorkspaceTemplateService();
  const workspace: Workspace = {
    id: "workspace-a",
    tenantId: "tenant-a",
    legalEntityId: "entity-a",
    name: "Studio",
    onboardingStatus: "PROFILE",
    createdAt: now,
    updatedAt: now,
    legalEntity: {
      id: "entity-a",
      tenantId: "tenant-a",
      kind: "COMPANY",
      legalName: "Studio",
      countryCode: "DE",
      currency: "EUR",
      createdAt: now,
      updatedAt: now,
    },
  };
  let membershipRole: WorkspaceMembershipRole = "OWNER";
  const hasAccess = (tenantId: string, workspaceId: string) =>
    tenantId === "tenant-a" && workspaceId === workspace.id;
  const workspaces = {
    getWorkspaceByIdWithLegalEntity: vi.fn(async (tenantId: string, workspaceId: string) =>
      hasAccess(tenantId, workspaceId) ? workspace : null
    ),
    checkUserHasWorkspaceAccess: vi.fn(
      async (tenantId: string, workspaceId: string, userId: string) =>
        hasAccess(tenantId, workspaceId) && userId === "user-a"
    ),
    getMembershipByUserAndWorkspace: vi.fn(async () => ({ role: membershipRole })),
  } as unknown as WorkspaceRepositoryPort;
  const resolver = new WorkspaceExperienceResolverService(entitlementService, template, workspaces);
  const dependencies = new DependencyResolverService();
  const packages = new OperationalPackageService(registry, dependencies, entitlements);
  const menuOverrides: TenantMenuOverrideRepositoryPort = {
    findByTenantAndScope: vi.fn(async () => null),
    upsert: vi.fn(),
    delete: vi.fn(),
  };
  const menu = new MenuComposerService(
    new MenuBuilderService(registry, entitlementService, menuOverrides)
  );
  const useCase = new GetWorkspaceConfigUseCase(
    menu,
    resolver,
    template,
    workspaces,
    repo,
    registry,
    packages
  );
  const input: GetWorkspaceConfigInput = {
    tenantId: "tenant-a",
    workspaceId: "workspace-a",
    userId: "user-a",
    permissions: [],
    scope: "web",
    surfaceId: "platform",
    surfaceResolutionSource: "default",
    surfaceHeaderMismatch: false,
    route: "/workspaces/workspace-a/config",
    packageId: "internal-operations",
  };
  const config = (extra: Partial<GetWorkspaceConfigInput> = {}) =>
    useCase.execute({ ...input, ...extra });
  const schedule = async () => (await config()).operationalPackage!.experiences[0].availability;
  const changeBooking = (update: Partial<AppManifest>) => {
    const booking = manifests.get("booking")!;
    manifests.set("booking", { ...booking, ...update });
  };
  return {
    config,
    schedule,
    input,
    repo,
    installs,
    install,
    overrides,
    registry,
    manifests,
    entitlements,
    resolver,
    packages,
    changeBooking,
    setRole: (role: WorkspaceMembershipRole) => {
      membershipRole = role;
    },
  };
}

describe("Operational package configuration integration (in-memory persistence)", () => {
  it("composes the selected existing client without finance and names undelivered experiences honestly", async () => {
    const f = fixture();
    const result = await f.config();
    expect(WorkspaceConfigSchema.safeParse(result).success).toBe(true);
    expect(result.operationalPackage?.client).toBe("openbuk-web");
    expect(result.operationalPackage?.experiences).toEqual([
      {
        id: "schedule",
        label: "Schedule",
        appId: "booking",
        availability: { status: "available", route: "/app" },
      },
      {
        id: "team",
        label: "Team",
        availability: { status: "unavailable", reason: "not-implemented" },
      },
      {
        id: "daily-work",
        label: "Daily Work",
        appId: "tasks",
        availability: { status: "unavailable", reason: "app-disabled" },
      },
    ]);
    expect(result.home.widgets).toEqual([]);
    expect(result.navigation.groups).toEqual([]);
    expect(result.capabilities["booking.basic"]).toBe(true);
    expect(result.capabilities["tax.vatReporting"]).toBe(false);
    expect(result.capabilities["sales.quotes"]).toBe(false);
    expect([...f.installs.keys()]).toEqual(["booking"]);
    expect(f.repo.upsert).not.toHaveBeenCalled();
  });

  it("contributes Daily Work only when Tasks, People and task access are enabled, without finance", async () => {
    const f = fixture();
    f.install("tasks");
    f.install("people");
    const experience = (result: Awaited<ReturnType<typeof f.config>>) =>
      result.operationalPackage!.experiences.find((e) => e.id === "daily-work");
    expect(experience(await f.config({ permissions: ["tasks.read"] }))).toMatchObject({
      appId: "tasks",
      availability: { status: "available", route: "/app/tasks" },
    });
    expect(experience(await f.config())).toMatchObject({
      availability: { status: "unavailable", reason: "permission-denied" },
    });
    f.install("people", false);
    expect(experience(await f.config({ permissions: ["tasks.read"] }))?.availability.status).toBe(
      "unavailable"
    );
    expect([...f.installs.keys()]).toEqual(["booking", "tasks", "people"]);
  });
  it("keeps installation, effective app enablement and product access separate", async () => {
    const f = fixture();
    f.install("booking", false);
    expect(await f.schedule()).toEqual({ status: "unavailable", reason: "app-disabled" });
    f.install("booking");
    f.overrides.set("app.booking.enabled", false);
    expect(await f.schedule()).toEqual({ status: "unavailable", reason: "app-disabled" });
    f.overrides.set("app.booking.enabled", true);
    f.overrides.set(OpenBukBookingEnabledKey, false);
    expect(await f.schedule()).toEqual({ status: "unavailable", reason: "product-not-entitled" });
    f.overrides.set(OpenBukBookingEnabledKey, true);
    expect((await f.schedule()).status).toBe("available");
  });

  it("does not confuse workspace policy or user permissions with tenant enablement", async () => {
    const f = fixture();
    const context = await f.resolver.resolve(f.input);
    context.enabledCapabilities.delete("booking.basic");
    const result = await f.packages.compose(context, true);
    expect(result.experiences[0].availability).toEqual({
      status: "unavailable",
      reason: "workspace-capability-disabled",
    });
    f.setRole("MEMBER");
    expect(await f.schedule()).toEqual({ status: "unavailable", reason: "permission-denied" });
    f.setRole("OWNER");
    f.changeBooking({
      operationalExperiences: [
        {
          ...f.manifests.get("booking")!.operationalExperiences![0],
          requiredPermissions: ["test.schedule.read"],
        },
      ],
    });
    expect(await f.schedule()).toEqual({ status: "unavailable", reason: "permission-denied" });
    const permitted = await f.config({ permissions: ["test.schedule.read"] });
    expect(permitted.operationalPackage?.experiences[0].availability.status).toBe("available");
  });

  it("honors actual manifest dependencies instead of enabling them on a config read", async () => {
    const f = fixture();
    f.changeBooking({ dependencies: ["forms"] });
    expect(await f.schedule()).toEqual({ status: "unavailable", reason: "dependency-unavailable" });
    f.install("forms");
    f.overrides.set("app.forms.enabled", true);
    expect((await f.schedule()).status).toBe("available");
    expect(f.repo.upsert).not.toHaveBeenCalled();
  });

  it("preserves disabled optional installs and configuration across legacy and package reads", async () => {
    const f = fixture();
    f.install("tax");
    const audit = { log: vi.fn() };
    const disable = new DisableAppUseCase(
      f.registry,
      f.repo,
      new DependencyResolverService(),
      audit
    );
    await disable.execute({ tenantId: "tenant-a", appId: "tax", actorUserId: "user-a" });
    const before = { ...f.installs.get("tax")! };
    const legacy = await f.config({ packageId: undefined });
    expect(legacy.operationalPackage).toBeUndefined();
    expect(legacy.capabilities["sales.quotes"]).toBe(true);
    expect(legacy.navigation.groups.some((group) => group.id === "tax")).toBe(false);
    expect((await f.schedule()).status).toBe("available");
    expect(f.installs.get("tax")).toEqual(before);
    expect(f.repo.delete).not.toHaveBeenCalled();
  });

  it("degrades missing or cyclic provider dependencies without breaking other package sections", async () => {
    const f = fixture();
    f.changeBooking({ dependencies: ["not-registered"] });
    expect(await f.schedule()).toEqual({ status: "unavailable", reason: "dependency-unavailable" });
    f.changeBooking({ dependencies: ["booking"] });
    expect(await f.schedule()).toEqual({ status: "unavailable", reason: "dependency-unavailable" });
  });

  it("rejects unauthorized workspace access and incompatible client scopes", async () => {
    const f = fixture();
    await expect(f.config({ userId: "other-user" })).rejects.toBeInstanceOf(ForbiddenException);
    await expect(f.config({ workspaceId: "workspace-other" })).rejects.toThrow(
      "Workspace not found"
    );
    await expect(f.config({ tenantId: "other-tenant" })).rejects.toThrow("Workspace not found");
    await expect(f.config({ scope: "pos", surfaceId: "pos" })).rejects.toThrow(
      "OpenBuk web client"
    );
    await expect(f.config({ surfaceId: "crm" })).rejects.toThrow("OpenBuk web client");
  });

  it("validates the opt-in without breaking existing query shapes", () => {
    expect(GetWorkspaceConfigQuerySchema.parse({})).toEqual({ scope: "web" });
    expect(GetWorkspaceConfigQuerySchema.parse({ packageId: "internal-operations" })).toEqual({
      scope: "web",
      packageId: "internal-operations",
    });
    expect(GetWorkspaceConfigQuerySchema.safeParse({ packageId: "invented-package" }).success).toBe(
      false
    );
  });
});
