import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { Test } from "@nestjs/testing";
import type { INestApplication } from "@nestjs/common";
import request from "supertest";
import { mockDeep } from "vitest-mock-extended";
import { PrismaExtKvAdapter } from "@corely/data";
import { NoopLogger, NotFoundError, err, type AuditPort, type OutboxPort } from "@corely/kernel";
import { StaffProfileSchema } from "@corely/contracts";
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
import { TenantEntitlementService } from "../application/services/tenant-entitlement.service";
import { EntitlementGuard } from "../guards/entitlement.guard";
import { AppRegistry } from "../infrastructure/registries/app-registry";
import { invoicesAppManifest } from "../../invoices/invoices.manifest";
import { PrismaTenantAppInstallRepositoryAdapter } from "../infrastructure/adapters/prisma-tenant-app-install-repository.adapter";
import { InvoicesHttpController } from "../../invoices/adapters/http/invoices.controller";
import { InvoicesApplication } from "../../invoices/application/invoices.application";
import { GetInvoiceByIdUseCase } from "../../invoices/application/use-cases/get-invoice-by-id/get-invoice-by-id.usecase";
import { PrismaInvoiceRepoAdapter } from "../../invoices/infrastructure/adapters/prisma-invoice-repository.adapter";
import { StaffController } from "../../people/adapters/http/staff.controller";
import { StaffDirectoryUseCase } from "../../people/application/staff-directory.usecase";
import { StaffAvailabilityUseCase } from "../../people/application/staff-availability.usecase";
import { ExtStaffRepositoryAdapter } from "../../people/infrastructure/ext-staff-repository.adapter";
import type { TransactionalStaffLinkLookup } from "../../people/application/ports/staff-repository.port";
import type { StaffBookingPort } from "../../people/application/ports/staff-availability.port";
import { CustomersHttpController } from "../../party/adapters/http/customers.controller";
import { PartyApplication } from "../../party/application/party.application";
import {
  PARTY_QUERY_PORT,
  type PartyQueryPort,
} from "../../party/application/ports/party-query.port";
import { DocumentsController } from "../../documents/adapters/http/documents.controller";
import { InvoicePdfController } from "../../documents/adapters/http/invoice-pdf.controller";
import { DocumentsApplication } from "../../documents/application/documents.application";
import { GetDownloadUrlUseCase } from "../../documents/application/use-cases/get-download-url/get-download-url.usecase";
import { PrismaDocumentRepoAdapter } from "../../documents/infrastructure/prisma/prisma-document-repo.adapter";
import { PrismaFileRepoAdapter } from "../../documents/infrastructure/prisma/prisma-file-repo.adapter";
import { FakeObjectStoragePort } from "../../documents/testkit/fakes/fake-object-storage";

// Real JWT, membership/grant/workspace repositories and owning read adapters.
// Only delivery/business-command sinks and the entitlement configuration port are synthetic.
describe.skipIf(!process.env.SSO_TEST_DATABASE_URL)("focused API access boundaries", () => {
  let fixture: Awaited<ReturnType<typeof createSsoTestContext>>;
  let app: INestApplication;
  let token: string;
  let workspaceA: string;
  let workspaceB: string;
  let invoiceId: string;
  let staffId: string;
  let registry: AppRegistry;
  let grants: PrismaRolePermissionGrantRepository;
  const enabled = new Set<string>();
  const invoices = mockDeep<InvoicesApplication>();
  const documents = mockDeep<DocumentsApplication>();
  beforeEach(async () => {
    fixture = await createSsoTestContext();
    const { prisma, tenantId, userId } = fixture;
    workspaceA = `wa-${userId}`;
    workspaceB = `wb-${userId}`;
    invoiceId = `invoice-${userId}`;
    staffId = `staff-${userId}`;
    const legal = await prisma.legalEntity.create({
      data: {
        tenantId,
        kind: "COMPANY",
        legalName: "Synthetic team",
        countryCode: "DE",
        currency: "EUR",
      },
    });
    for (const id of [workspaceA, workspaceB]) {
      await prisma.workspace.create({ data: { id, tenantId, legalEntityId: legal.id, name: id } });
      await prisma.workspaceMembership.create({
        data: { workspaceId: id, userId, role: "MEMBER" },
      });
    }
    await prisma.invoice.create({
      data: {
        id: invoiceId,
        tenantId: workspaceA,
        customerPartyId: "synthetic-customer",
        currency: "EUR",
      },
    });
    const now = new Date().toISOString();
    await prisma.extKv.create({
      data: {
        tenantId,
        moduleId: "people",
        scope: `workspace:${workspaceA}:profiles`,
        key: staffId,
        value: StaffProfileSchema.parse({
          id: staffId,
          workspaceId: workspaceA,
          displayName: "Synthetic colleague",
          version: 1,
          archivedAt: null,
          createdAt: now,
          updatedAt: now,
        }),
      },
    });
    registry = new AppRegistry();
    registry.loadManifests();
    const installs = new PrismaTenantAppInstallRepositoryAdapter(prisma);
    enabled.clear();
    for (const appId of ["invoices", "parties", "people"]) {
      enabled.add(appId);
      await installs.upsert({
        id: `${appId}-${userId}`,
        tenantId,
        appId,
        enabled: true,
        installedVersion: "1.0.0",
      });
    }
    const entitlements = new TenantEntitlementService(installs, registry, {
      getAppEnablementMap: async () => Object.fromEntries([...enabled].map((id) => [id, true])),
      isAppEnabled: async (_tenant, id) => enabled.has(id),
    });
    const members = new PrismaMembershipRepository(prisma);
    const workspaceAccess = new AuthorizeWorkspaceUseCase(new PrismaWorkspaceRepository(prisma));
    grants = new PrismaRolePermissionGrantRepository(prisma);
    const permissions = new GetEffectivePermissionsUseCase(grants, members, workspaceAccess);
    const authorize = new AuthorizeRequestContextUseCase(members, workspaceAccess);
    const tokens = new JwtTokenService();
    token = tokens.generateAccessToken({
      userId,
      email: fixture.email,
      tenantId,
      roleIds: ["forged-stale-role"],
    });
    const getInvoice = new GetInvoiceByIdUseCase({
      logger: new NoopLogger(),
      invoiceRepo: new PrismaInvoiceRepoAdapter(prisma),
    });
    invoices.getInvoiceById.execute.mockImplementation((input, ctx) =>
      getInvoice.execute(input, ctx)
    );
    const party = mockDeep<PartyApplication>();
    party.getCustomerById.execute.mockResolvedValue(
      err(new NotFoundError("Synthetic customer unavailable"))
    );
    const getDocument = new GetDownloadUrlUseCase({
      logger: new NoopLogger(),
      documentRepo: new PrismaDocumentRepoAdapter(prisma),
      fileRepo: new PrismaFileRepoAdapter(prisma),
      objectStorage: new FakeObjectStoragePort(),
      downloadTtlSeconds: 60,
    });
    documents.getDownloadUrl.execute.mockImplementation((input, ctx) =>
      getDocument.execute(input, ctx)
    );
    const staff = new StaffDirectoryUseCase(
      new ExtStaffRepositoryAdapter(prisma, new PrismaExtKvAdapter(prisma)),
      permissions,
      mockDeep<TransactionalStaffLinkLookup>(),
      mockDeep<TransactionalStaffLinkLookup>(),
      mockDeep<TransactionalStaffLinkLookup>(),
      mockDeep<AuditPort>(),
      mockDeep<OutboxPort>(),
      entitlements,
      mockDeep<StaffBookingPort>()
    );
    const module = await Test.createTestingModule({
      controllers: [
        InvoicesHttpController,
        StaffController,
        CustomersHttpController,
        DocumentsController,
        InvoicePdfController,
      ],
      providers: [
        AuthGuard,
        RbacGuard,
        EntitlementGuard,
        { provide: TOKEN_SERVICE_TOKEN, useValue: tokens },
        { provide: AuthorizeRequestContextUseCase, useValue: authorize },
        { provide: GetEffectivePermissionsUseCase, useValue: permissions },
        { provide: TenantEntitlementService, useValue: entitlements },
        { provide: InvoicesApplication, useValue: invoices },
        { provide: PartyApplication, useValue: party },
        { provide: PARTY_QUERY_PORT, useValue: mockDeep<PartyQueryPort>() },
        { provide: DocumentsApplication, useValue: documents },
        { provide: StaffDirectoryUseCase, useValue: staff },
        { provide: StaffAvailabilityUseCase, useValue: mockDeep<StaffAvailabilityUseCase>() },
      ],
    }).compile();
    app = module.createNestApplication({ logger: false });
    app.useGlobalFilters(new DomainExceptionFilter());
    await app.init();
  });
  afterEach(async () => {
    await app?.close();
    if (!fixture) {
      return;
    }
    const { prisma, tenantId } = fixture;
    await prisma.invoice.deleteMany({ where: { id: invoiceId } });
    await prisma.extKv.deleteMany({ where: { tenantId, moduleId: "people" } });
    await prisma.workspace.deleteMany({ where: { tenantId } });
    await prisma.legalEntity.deleteMany({ where: { tenantId } });
    await fixture.cleanup();
  });
  const keys = [
    "sales.invoices.read",
    "sales.invoices.manage",
    "sales.invoices.issue",
    "sales.invoices.void",
    "sales.payments.record",
    "people.directory.read",
    "documents.read",
    "party.customers.read",
  ];
  async function allow(allowed = keys) {
    await grants.replaceAll(
      fixture.tenantId,
      fixture.membership.roleId,
      allowed.map((key) => ({ key, effect: "ALLOW" }))
    );
  }
  function get(path: string, workspace = workspaceA) {
    return request(app.getHttpServer())
      .get(path)
      .set("Authorization", `Bearer ${token}`)
      .set("x-workspace-id", workspace);
  }
  it("requires operation permissions regardless of a forged app selector", async () => {
    await get(`/invoices/${invoiceId}?launchId=invoice`)
      .set("x-corely-app-id", "invoices")
      .expect(403);
    await get("/people/staff").expect(403);
    await get("/customers/search?q=test").expect(403);
    await get("/documents/unknown/download-url").expect(403);
    await allow();
    await get(`/invoices/${invoiceId}`).expect(200);
    await get(`/people/staff/${staffId}`).expect(200);
    await get(`/people/staff/${staffId}/private`).expect(403);
    await allow([]);
    await get(`/invoices/${invoiceId}`).expect(403);
  });
  it("requires command permissions independently of invoice read access", async () => {
    await allow(["sales.invoices.read"]);
    for (const path of [
      "/invoices",
      `/invoices/${invoiceId}/finalize`,
      `/invoices/${invoiceId}/send`,
      `/invoices/${invoiceId}/payments`,
      `/invoices/${invoiceId}/cancel`,
      `/invoices/${invoiceId}/share-link`,
    ]) {
      await request(app.getHttpServer())
        .post(path)
        .set("Authorization", `Bearer ${token}`)
        .set("x-workspace-id", workspaceA)
        .send({})
        .expect(403);
    }
  });
  it("rejects a valid token with a foreign tenant scope instead of trusting app hints", async () => {
    await allow();
    const foreign = new JwtTokenService().generateAccessToken({
      userId: fixture.userId,
      email: fixture.email,
      tenantId: "foreign-tenant",
      roleIds: [],
    });
    for (const path of [
      `/invoices/${invoiceId}`,
      "/people/staff",
      "/customers/search?q=test",
      "/documents/unknown/download-url",
    ]) {
      await request(app.getHttpServer())
        .get(path)
        .set("Authorization", `Bearer ${foreign}`)
        .set("x-workspace-id", workspaceA)
        .expect(403);
    }
  });
  it("keeps records isolated even when the user belongs to both workspaces", async () => {
    await allow();
    await get(`/invoices/${invoiceId}`, workspaceB).expect(404);
    await get(`/people/staff/${staffId}`, workspaceB).expect(404);
    await get(`/invoices/${invoiceId}`, "unjoined-workspace").expect(403);
    await get(`/people/staff/${staffId}`, "unjoined-workspace").expect(403);
    await fixture.prisma.membership.delete({ where: { id: fixture.membership.id } });
    await get(`/invoices/${invoiceId}`).expect(403);
    await get("/people/staff").expect(403);
  });
  it("denies disabled apps and unsupported PDF capability on direct calls", async () => {
    await allow();
    enabled.delete("invoices");
    await get(`/invoices/${invoiceId}`).expect(403);
    enabled.delete("people");
    await get("/people/staff").expect(403);
    enabled.delete("parties");
    await get("/customers/search?q=test").expect(403);
    enabled.add("invoices");
    registry.register({ ...invoicesAppManifest, capabilities: [] });
    await get(`/invoices/${invoiceId}/pdf`).expect(403);
    await request(app.getHttpServer())
      .post(`/invoices/${invoiceId}/pdf`)
      .set("Authorization", `Bearer ${token}`)
      .set("x-workspace-id", workspaceA)
      .send({})
      .expect(403);
  });
  it("does not expose personnel documents through the generic document API", async () => {
    await allow();
    await get("/documents/personnel-private-record/download-url").expect(404);
  });
});
