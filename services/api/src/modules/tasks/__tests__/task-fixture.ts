import { StaffSelfServiceController } from "../../people/adapters/http/staff-self-service.controller";
import { StaffSelfServiceUseCase } from "../../people/application/staff-self-service.usecase";
import { StaffLifecycleUseCase } from "../../people/application/staff-lifecycle.usecase";
import { ExtStaffLifecycleAdapter } from "../../people/infrastructure/ext-staff-lifecycle.adapter";
import { StaffWorkspaceAccessAdapter } from "../../workspaces/public";
import { StaffTasksAdapter } from "../public";
import { ExtStaffAbsenceAdapter } from "../../people/infrastructure/ext-staff-absence.adapter";
import { ExtRecurringChecklistAdapter } from "../infrastructure/ext-recurring-checklist.adapter";
import { RecurringChecklistsUseCase } from "../application/recurring-checklists.usecase";
import { RecurringGenerationUseCase } from "../application/recurring-generation.usecase";
import { ChecklistMaterializer } from "../application/checklist-materializer";
import { RecurringChecklistsController } from "../adapters/http/recurring-checklists.controller";
import { StaffWorkdayLookup } from "../../people/public";
import { StaffBookingAdapter } from "../../booking/public";
import { StaffAvailabilityUseCase } from "../../people/application/staff-availability.usecase";
import { ExtStaffAvailabilityAdapter } from "../../people/infrastructure/ext-staff-availability.adapter";
import { tasksAppManifest } from "../tasks.manifest";
import { EmployeeTasksUseCase } from "../application/employee-tasks.usecase";
import { EmployeeTasksController } from "../adapters/http/employee-tasks.controller";
import { ExtTaskRepositoryAdapter } from "../infrastructure/ext-task-repository.adapter";
import { StaffOperationsLookup } from "../../people/public";
import { ProblemDetailsExceptionFilter } from "../../../shared/exceptions/problem-details.filter";
import { EnableAppUseCase } from "../../platform/application/use-cases/enable-app.usecase";
import { DisableAppUseCase } from "../../platform/application/use-cases/disable-app.usecase";
import { DependencyResolverService } from "../../platform/application/services/dependency-resolver.service";
import { PrismaTenantAppInstallRepositoryAdapter } from "../../platform/infrastructure/adapters/prisma-tenant-app-install-repository.adapter";
import { TenantEntitlementService } from "../../platform/application/services/tenant-entitlement.service";
import type { AppRegistryPort } from "../../platform/application/ports/app-registry.port";
import { FeatureCatalogService } from "../../platform-entitlements/application/feature-catalog.service";
import { TenantEntitlementsService } from "../../platform-entitlements/application/tenant-entitlements.service";
import { TenantEntitlementsReadAdapter } from "../../platform-entitlements/adapters/tenant-entitlements-read.adapter";
import { peopleAppManifest } from "../../people/people.manifest";
import { randomUUID } from "node:crypto";
import { Test } from "@nestjs/testing";
import {
  type PrismaService,
  PrismaExtKvAdapter,
  PrismaAuditAdapter,
  PrismaOutboxAdapter,
} from "@corely/data";
import { StaffDirectoryUseCase } from "../../people/application/staff-directory.usecase";
import { StaffController } from "../../people/adapters/http/staff.controller";
import { ExtStaffRepositoryAdapter } from "../../people/infrastructure/ext-staff-repository.adapter";
import { AuthGuard } from "../../identity/adapters/http/auth.guard";
import { AuthorizeRequestContextUseCase } from "../../identity/application/use-cases/authorize-request-context.usecase";
import { GetEffectivePermissionsUseCase } from "../../identity/public";
import { StaffAccountLookupAdapter } from "../../identity/public";
import { StaffPartyLookupAdapter } from "../../party/public";
import { StaffResourceLookupAdapter } from "../../booking/public";
import { PrismaMembershipRepository } from "../../identity/infrastructure/adapters/prisma-membership-repository.adapter";
import { PrismaRolePermissionGrantRepository } from "../../identity/infrastructure/adapters/prisma-role-permission-grant-repository.adapter";
import { PrismaWorkspaceRepository } from "../../workspaces/infrastructure/adapters/prisma-workspace-repository.adapter";
import { AuthorizeWorkspaceUseCase } from "../../workspaces/public";
import type { UseCaseContext } from "@corely/kernel";

export async function tasksFixture(prisma: PrismaService) {
  const uid = () => randomUUID();
  const tenantA = uid(),
    tenantB = uid(),
    workspaceA = uid(),
    workspaceA2 = uid(),
    workspaceB = uid();
  const manager = uid(),
    staff = uid(),
    outsider = uid();
  const managerRole = uid(),
    staffRole = uid(),
    otherRole = uid();
  const managerKeys = [
    "tasks.read",
    "tasks.manage",
    "tasks.own.update",
    "people.directory.read",
    "people.self.read",
    "people.self.update",
    "people.profile.manage",
    "people.private.read",
    "people.private.manage",
  ];
  for (const [tenantId, workspaces, users] of [
    [
      tenantA,
      [workspaceA, workspaceA2],
      [
        [manager, managerRole, "Manager"],
        [staff, staffRole, "Staff"],
      ],
    ],
    [tenantB, [workspaceB], [[outsider, otherRole, "Manager"]]],
  ] as const) {
    await prisma.tenant.create({ data: { id: tenantId, name: "People test", slug: tenantId } });
    const legal = await prisma.legalEntity.create({
      data: {
        tenantId,
        kind: "COMPANY",
        legalName: "Test company",
        countryCode: "DE",
        currency: "EUR",
      },
    });
    for (const id of workspaces) {
      await prisma.workspace.create({ data: { id, tenantId, legalEntityId: legal.id, name: id } });
    }
    for (const [id, roleId, name] of users) {
      await prisma.user.create({
        data: { id, email: `${id}@example.invalid`, name, passwordHash: "unused" },
      });
      await prisma.role.create({ data: { id: roleId, tenantId, name } });
      await prisma.membership.create({ data: { tenantId, userId: id, roleId } });
      const keys =
        name === "Staff"
          ? [
              "people.directory.read",
              "people.self.read",
              "people.self.update",
              "tasks.read",
              "tasks.own.update",
            ]
          : managerKeys;
      await prisma.rolePermissionGrant.createMany({
        data: keys.map((permissionKey) => ({ tenantId, roleId, permissionKey, effect: "ALLOW" })),
      });
      for (const workspaceId of name === "Staff" ? [workspaceA] : workspaces) {
        await prisma.workspaceMembership.create({
          data: { workspaceId, userId: id, role: "MEMBER", status: "ACTIVE" },
        });
      }
    }
  }
  const resource = await prisma.bookingResource.create({
    data: {
      tenantId: tenantA,
      workspaceId: workspaceA,
      name: "Anna's bookable time",
      type: "STAFF",
      tags: [],
    },
  });
  const foreignResource = await prisma.bookingResource.create({
    data: {
      tenantId: tenantA,
      workspaceId: workspaceA2,
      name: "Other workspace",
      type: "STAFF",
      tags: [],
    },
  });
  const party = await prisma.party.create({
    data: {
      tenantId: tenantA,
      displayName: "Existing party",
      kind: "INDIVIDUAL",
      notes: "party-secret",
      contactPoints: {
        create: { tenantId: tenantA, type: "EMAIL", value: "party-private@example.invalid" },
      },
    },
  });
  const foreignParty = await prisma.party.create({
    data: { tenantId: tenantB, displayName: "Other tenant", kind: "INDIVIDUAL" },
  });
  const memberships = new PrismaMembershipRepository(prisma);
  const authorizeWorkspace = new AuthorizeWorkspaceUseCase(new PrismaWorkspaceRepository(prisma));
  const permissions = new GetEffectivePermissionsUseCase(
    new PrismaRolePermissionGrantRepository(prisma),
    memberships,
    authorizeWorkspace
  );
  const repo = new ExtStaffRepositoryAdapter(prisma, new PrismaExtKvAdapter(prisma));
  const accountLookup = new StaffAccountLookupAdapter(prisma, authorizeWorkspace);
  const partyLookup = new StaffPartyLookupAdapter(prisma);
  const resourceLookup = new StaffResourceLookupAdapter(prisma);
  const audit = new PrismaAuditAdapter(prisma),
    outbox = new PrismaOutboxAdapter(prisma);
  const registry: AppRegistryPort = {
    get: (id) => [peopleAppManifest, tasksAppManifest].find((m) => m.appId === id),
    list: () => [peopleAppManifest, tasksAppManifest],
    findByCapability: () => [peopleAppManifest],
    has: (id) => ["people", "tasks"].includes(id),
  };
  const catalog = new FeatureCatalogService(registry);
  catalog.compileCatalog();
  const appInstalls = new PrismaTenantAppInstallRepositoryAdapter(prisma);
  const resolver = new DependencyResolverService();
  const enableApp = new EnableAppUseCase(registry, appInstalls, resolver, audit, { newId: uid });
  const entitlementService = new TenantEntitlementsService(prisma, catalog, enableApp, audit);
  const entitlements = new TenantEntitlementsReadAdapter(entitlementService);
  const disableApp = new DisableAppUseCase(registry, appInstalls, resolver, audit);
  const platformEntitlements = new TenantEntitlementService(appInstalls, registry, entitlements);
  for (const [tenantId, actorUserId] of [
    [tenantA, manager],
    [tenantB, outsider],
  ]) {
    await enableApp.execute({ tenantId, actorUserId, appId: "tasks" });
  }
  const booking = new StaffBookingAdapter(prisma);
  const usecase = new StaffDirectoryUseCase(
    repo,
    permissions,
    accountLookup,
    partyLookup,
    resourceLookup,
    audit,
    outbox,
    platformEntitlements,
    booking
  );
  const availability = new StaffAvailabilityUseCase(
    usecase,
    repo,
    new ExtStaffAvailabilityAdapter(new PrismaExtKvAdapter(prisma)),
    booking,
    audit,
    outbox,
    { now: () => new Date("2026-11-08T00:00:00Z") },
    new ExtStaffAbsenceAdapter(prisma, new PrismaExtKvAdapter(prisma))
  );
  const taskRepo = new ExtTaskRepositoryAdapter(prisma, new PrismaExtKvAdapter(prisma));
  const tasks = new EmployeeTasksUseCase(
    taskRepo,
    permissions,
    new StaffOperationsLookup(repo),
    platformEntitlements,
    audit,
    outbox
  );
  let instant = new Date("2026-11-08T00:00:00Z");
  const clock = { now: () => new Date(instant) };
  const recurringRepo = new ExtRecurringChecklistAdapter(prisma, new PrismaExtKvAdapter(prisma));
  const staffOps = new StaffOperationsLookup(repo);
  const materializer = new ChecklistMaterializer(
    recurringRepo,
    taskRepo,
    tasks,
    staffOps,
    new StaffWorkdayLookup(new ExtStaffAvailabilityAdapter(new PrismaExtKvAdapter(prisma))),
    clock,
    audit,
    outbox
  );
  const checklists = new RecurringChecklistsUseCase(
    recurringRepo,
    taskRepo,
    tasks,
    staffOps,
    materializer,
    clock,
    audit,
    outbox
  );
  const generation = new RecurringGenerationUseCase(
    recurringRepo,
    taskRepo,
    staffOps,
    materializer,
    clock
  );
  const lifecycleRepo = new ExtStaffLifecycleAdapter(new PrismaExtKvAdapter(prisma));
  const taskStaff = new StaffTasksAdapter(
    prisma,
    new PrismaExtKvAdapter(prisma),
    permissions,
    platformEntitlements,
    staffOps,
    audit,
    outbox,
    clock
  );
  const staffAccess = new StaffWorkspaceAccessAdapter(prisma, authorizeWorkspace, audit, outbox);
  const self = new StaffSelfServiceUseCase(
    usecase,
    repo,
    new ExtStaffAvailabilityAdapter(new PrismaExtKvAdapter(prisma)),
    taskStaff,
    lifecycleRepo,
    audit,
    outbox,
    clock
  );
  const lifecycle = new StaffLifecycleUseCase(
    usecase,
    repo,
    taskStaff,
    staffAccess,
    lifecycleRepo,
    booking,
    audit,
    outbox,
    clock
  );
  const tokens = {
    manager: { userId: manager, tenantId: tenantA },
    staff: { userId: staff, tenantId: tenantA },
    outsider: { userId: outsider, tenantId: tenantB },
  };
  const auth = new AuthGuard(
    {
      verifyAccessToken: async (token) =>
        token in tokens
          ? {
              ...tokens[token as keyof typeof tokens],
              roleIds: ["stale-admin"],
              email: "test@example.invalid",
              iat: 0,
              exp: 9999999999,
            }
          : null,
      generateAccessToken: () => "unused",
      generateRefreshToken: () => "unused",
      getExpirationTimes: () => ({ accessTokenExpiresIn: "1h", refreshTokenExpiresInMs: 3600000 }),
    },
    new AuthorizeRequestContextUseCase(memberships, authorizeWorkspace)
  );
  const module = await Test.createTestingModule({
    controllers: [
      StaffSelfServiceController,
      StaffController,
      RecurringChecklistsController,
      EmployeeTasksController,
    ],
    providers: [
      { provide: EmployeeTasksUseCase, useValue: tasks },
      { provide: RecurringChecklistsUseCase, useValue: checklists },
      { provide: StaffDirectoryUseCase, useValue: usecase },
      { provide: StaffSelfServiceUseCase, useValue: self },
      { provide: StaffLifecycleUseCase, useValue: lifecycle },
      { provide: StaffAvailabilityUseCase, useValue: availability },
      { provide: AuthGuard, useValue: auth },
    ],
  })
    .overrideGuard(AuthGuard)
    .useValue(auth)
    .compile();
  const app = module.createNestApplication();
  app.useGlobalFilters(new ProblemDetailsExceptionFilter());
  await app.init();
  const ctx: UseCaseContext = { tenantId: tenantA, workspaceId: workspaceA, userId: manager };
  async function cleanup() {
    await app.close();
    for (const tenantId of [tenantA, tenantB]) {
      await prisma.extKv.deleteMany({ where: { tenantId, moduleId: { in: ["people", "tasks"] } } });
      await prisma.auditLog.deleteMany({ where: { tenantId } });
      await prisma.outboxEvent.deleteMany({ where: { tenantId } });
      await prisma.bookingResource.deleteMany({ where: { tenantId } });
      await prisma.party.deleteMany({ where: { tenantId } });
      await prisma.workspace.deleteMany({ where: { tenantId } });
      await prisma.legalEntity.deleteMany({ where: { tenantId } });
      await prisma.tenant.delete({ where: { id: tenantId } });
    }
    await prisma.user.deleteMany({ where: { id: { in: [manager, staff, outsider] } } });
  }
  return {
    app,
    self,
    lifecycle,
    lifecycleRepo,
    taskStaff,
    staffAccess,
    tasks,
    checklists,
    generation,
    recurringRepo,
    materializer,
    setNow: (date: string) => {
      instant = new Date(date);
    },
    availability,
    taskRepo,
    prisma,
    repo,
    entitlements,
    platformEntitlements,
    appInstalls,
    enableApp,
    disableApp,
    entitlementService,
    usecase,
    permissions,
    accountLookup,
    partyLookup,
    resourceLookup,
    audit,
    outbox,
    tenantA,
    tenantB,
    workspaceA,
    workspaceA2,
    workspaceB,
    manager,
    staff,
    outsider,
    managerRole,
    staffRole,
    resource,
    foreignResource,
    party,
    foreignParty,
    ctx,
    cleanup,
  };
}
