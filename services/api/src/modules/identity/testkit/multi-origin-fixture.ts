// Disposable test composition only. Never imported by production modules.
import { randomUUID } from "node:crypto";
import { NoopLogger, TimeService } from "@corely/kernel";
import { createSsoTestContext } from "./sso-test-context";
import { PrismaMembershipRepository } from "../infrastructure/adapters/prisma-membership-repository.adapter";
import { PrismaTenantRepository } from "../infrastructure/adapters/prisma-tenant-repository.adapter";
import { PrismaUserRepository } from "../infrastructure/adapters/prisma-user-repository.adapter";
import { PrismaRolePermissionGrantRepository } from "../infrastructure/adapters/prisma-role-permission-grant-repository.adapter";
import { GetEffectivePermissionsUseCase } from "../application/use-cases/get-effective-permissions.usecase";
import { AuthorizeRequestContextUseCase } from "../application/use-cases/authorize-request-context.usecase";
import { SsoSessionService } from "../application/services/sso-session.service";
import { AuthorizeWorkspaceUseCase } from "../../workspaces/public";
import { ListWorkspacesUseCase } from "../../workspaces/application/use-cases/list-workspaces.usecase";
import { PrismaWorkspaceRepository } from "../../workspaces/infrastructure/adapters/prisma-workspace-repository.adapter";
import { AppRegistry } from "../../platform/infrastructure/registries/app-registry";
import { PrismaTenantAppInstallRepositoryAdapter } from "../../platform/infrastructure/adapters/prisma-tenant-app-install-repository.adapter";
import { PrismaTenantMenuOverrideRepositoryAdapter } from "../../platform/infrastructure/adapters/prisma-tenant-menu-override-repository.adapter";
import { TenantEntitlementService } from "../../platform/application/services/tenant-entitlement.service";
import { WorkspaceTemplateService } from "../../platform/application/services/workspace-template.service";
import { WorkspaceExperienceResolverService } from "../../platform/application/services/workspace-experience-resolver.service";
import { MenuBuilderService } from "../../platform/application/services/menu-builder.service";
import { MenuComposerService } from "../../platform/application/services/menu-composer.service";
import { ComposeMenuUseCase } from "../../platform/application/use-cases/compose-menu.usecase";
import { GetWorkspaceConfigUseCase } from "../../platform/application/use-cases/get-workspace-config.usecase";
import { ListAppCatalogUseCase } from "../../platform/application/use-cases/list-app-catalog.usecase";
import { ListAppLaunchesUseCase } from "../../platform/application/use-cases/list-app-launches.usecase";
import { GetAppManagementLinkUseCase } from "../../platform/application/use-cases/get-app-management-link.usecase";
import type { OperationalPackageService } from "../../platform/application/services/operational-package.service";
import { PrismaInvoiceRepoAdapter } from "../../invoices/infrastructure/adapters/prisma-invoice-repository.adapter";
import { ListInvoicesUseCase } from "../../invoices/application/use-cases/list-invoices/list-invoices.usecase";
import { GetInvoiceByIdUseCase } from "../../invoices/application/use-cases/get-invoice-by-id/get-invoice-by-id.usecase";

export const multiOriginHosts = {
  login: "127.0.0.1",
  app: "127.0.0.2",
  invoice: "127.0.0.3",
  hr: "127.0.0.4",
};
export const multiOriginOrigins = Object.fromEntries(
  Object.keys(multiOriginHosts).map((key) => [
    key,
    `https://${key === "app" ? "app" : key === "invoice" || key === "hr" ? `${key}.app` : key}.corely.test:8444`,
  ])
) as Record<keyof typeof multiOriginHosts, string>;

export async function createMultiOriginFixture() {
  const first = await createSsoTestContext(multiOriginOrigins, true);
  const second = await createSsoTestContext(multiOriginOrigins, true);
  const prisma = first.prisma;
  const workspaceIds = [randomUUID(), randomUUID(), randomUUID()];
  const invoiceIds = [randomUUID(), randomUUID()];
  const members = new PrismaMembershipRepository(prisma);
  const workspaceRepo = new PrismaWorkspaceRepository(prisma);
  const workspaceAccess = new AuthorizeWorkspaceUseCase(workspaceRepo);
  const authorize = new AuthorizeRequestContextUseCase(members, workspaceAccess);
  const grants = new PrismaRolePermissionGrantRepository(prisma);
  const permissions = new GetEffectivePermissionsUseCase(grants, members, workspaceAccess);
  const installs = new PrismaTenantAppInstallRepositoryAdapter(prisma);
  const registry = new AppRegistry();
  registry.loadManifests();
  // Explicit synthetic launch cohort. Never mutate the shared production manifest or HR availability.
  const invoiceManifest = registry.get("invoices");
  if (!invoiceManifest?.launch) {
    throw new Error("Invoice manifest required");
  }
  registry.register({
    ...invoiceManifest,
    launch: { ...invoiceManifest.launch, availability: "available" },
  });
  const entitlements = new TenantEntitlementService(installs, registry, {
    getAppEnablementMap: async (tenantId) =>
      Object.fromEntries(
        (await installs.listByTenant(tenantId)).map((entry) => [entry.appId, entry.enabled])
      ),
    isAppEnabled: async (tenantId, appId) =>
      (await installs.listByTenant(tenantId)).some(
        (entry) => entry.appId === appId && entry.enabled
      ),
  });
  const readerB = await prisma.role.create({
    data: { tenantId: second.tenantId, name: "Invoice reader" },
  });
  await prisma.membership.create({
    data: { tenantId: second.tenantId, userId: first.userId, roleId: readerB.id },
  });
  for (const [tenantId, ids] of [
    [first.tenantId, workspaceIds.slice(0, 2)],
    [second.tenantId, workspaceIds.slice(2)],
  ] as const) {
    const legal = await prisma.legalEntity.create({
      data: {
        tenantId,
        kind: "COMPANY",
        legalName: "Synthetic operations",
        countryCode: "DE",
        currency: "EUR",
      },
    });
    for (const id of ids) {
      await prisma.workspace.create({
        data: {
          id,
          tenantId,
          legalEntityId: legal.id,
          name:
            id === workspaceIds[0]
              ? "Alpha studio"
              : id === workspaceIds[1]
                ? "Alpha second studio"
                : "Beta studio",
          onboardingStatus: "DONE",
        },
      });
      await prisma.workspaceMembership.create({
        data: { workspaceId: id, userId: first.userId, role: "MEMBER" },
      });
      if (tenantId === second.tenantId) {
        await prisma.workspaceMembership.create({
          data: { workspaceId: id, userId: second.userId, role: "MEMBER" },
        });
      }
    }
    for (const appId of ["invoices", "parties", "people"]) {
      await installs.upsert({
        id: randomUUID(),
        tenantId,
        appId,
        enabled: true,
        installedVersion: "1.0.0",
      });
    }
  }
  for (const [index, workspaceId] of [workspaceIds[0], workspaceIds[2]].entries()) {
    await prisma.invoice.create({
      data: {
        id: invoiceIds[index],
        tenantId: workspaceId,
        customerPartyId: `synthetic-customer-${index}`,
        billToName: "Synthetic customer",
        currency: "EUR",
        number: `INV-401-${index + 1}`,
        lines: {
          create: [
            { id: randomUUID(), description: "Synthetic work", qty: 1, unitPriceCents: 10000 },
          ],
        },
      },
    });
  }
  const reset = async () => {
    await first.clearAttemptBudgets();
    await second.clearAttemptBudgets();
    await prisma.membership.upsert({
      where: { tenantId_userId: { tenantId: first.tenantId, userId: first.userId } },
      update: { roleId: first.membership.roleId },
      create: { tenantId: first.tenantId, userId: first.userId, roleId: first.membership.roleId },
    });
    for (const workspaceId of workspaceIds) {
      await prisma.workspaceMembership.updateMany({
        where: { workspaceId, userId: first.userId },
        data: { status: "ACTIVE" },
      });
    }
    for (const [tenantId, roleId] of [
      [first.tenantId, first.membership.roleId],
      [second.tenantId, readerB.id],
    ]) {
      await grants.replaceAll(tenantId, roleId, [{ key: "sales.invoices.read", effect: "ALLOW" }]);
    }
    await grants.replaceAll(second.tenantId, second.membership.roleId, [
      { key: "people.directory.read", effect: "ALLOW" },
    ]);
    await prisma.ssoCentralSession.updateMany({
      where: { userId: { in: [first.userId, second.userId] } },
      data: { revokedAt: new Date() },
    });
  };
  await reset();
  const template = new WorkspaceTemplateService();
  const experience = new WorkspaceExperienceResolverService(entitlements, template, workspaceRepo);
  const composer = new MenuComposerService(
    new MenuBuilderService(
      registry,
      entitlements,
      new PrismaTenantMenuOverrideRepositoryAdapter(prisma)
    )
  );
  const menus = new ComposeMenuUseCase(composer, experience, template, installs, registry);
  // Operational-package composition is outside this focused-app fixture; fail if it is accidentally requested.
  const operational = {
    compose: async () => {
      throw new Error("Operational package is outside this fixture");
    },
  } as unknown as OperationalPackageService;
  const config = new GetWorkspaceConfigUseCase(
    composer,
    experience,
    template,
    workspaceRepo,
    installs,
    registry,
    operational
  );
  const launches = new ListAppLaunchesUseCase(
    new ListAppCatalogUseCase(registry, installs, {
      invoice: multiOriginOrigins.invoice,
      hr: multiOriginOrigins.hr,
    }),
    menus
  );
  const sessions = new SsoSessionService(
    first.registrations,
    first.store,
    first.crypto,
    { now: () => new Date() },
    members,
    new PrismaTenantRepository(prisma),
    authorize,
    new PrismaUserRepository(prisma)
  );
  const invoiceRepo = new PrismaInvoiceRepoAdapter(prisma);
  const timeService = new TimeService(
    { now: () => new Date() },
    { getTenantTimeZone: async () => "Europe/Berlin" }
  );
  return {
    first,
    second,
    prisma,
    authorize,
    permissions,
    grants,
    entitlements,
    sessions,
    menus,
    config,
    launches,
    management: new GetAppManagementLinkUseCase(permissions),
    listWorkspaces: new ListWorkspacesUseCase(workspaceRepo),
    invoices: {
      listInvoices: new ListInvoicesUseCase({ logger: new NoopLogger(), invoiceRepo, timeService }),
      getInvoiceById: new GetInvoiceByIdUseCase({ logger: new NoopLogger(), invoiceRepo }),
    },
    workspaceIds,
    invoiceIds,
    reset,
    expire: () =>
      prisma.ssoAppSession.updateMany({
        where: { userId: first.userId },
        data: { idleExpiresAt: new Date(0) },
      }),
    revoke: () =>
      prisma.workspaceMembership.updateMany({
        where: { workspaceId: workspaceIds[0], userId: first.userId },
        data: { status: "DISABLED" },
      }),
    deny: () => grants.replaceAll(first.tenantId, first.membership.roleId, []),
    snapshot: () =>
      prisma.invoice.findMany({
        where: { id: { in: invoiceIds } },
        select: { id: true, updatedAt: true },
        orderBy: { id: "asc" },
      }),
    cleanup: async () => {
      await prisma.invoice.deleteMany({ where: { id: { in: invoiceIds } } });
      await prisma.workspace.deleteMany({ where: { id: { in: workspaceIds } } });
      await prisma.legalEntity.deleteMany({
        where: { tenantId: { in: [first.tenantId, second.tenantId] } },
      });
      await first.cleanup();
      await second.cleanup();
    },
  };
}
export type MultiOriginFixture = Awaited<ReturnType<typeof createMultiOriginFixture>>;
