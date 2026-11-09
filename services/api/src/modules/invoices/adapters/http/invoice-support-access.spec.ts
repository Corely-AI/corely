import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Test } from "@nestjs/testing";
import type { ExecutionContext, INestApplication } from "@nestjs/common";
import request from "supertest";
import { ok } from "@corely/kernel";
import type { ContextAwareRequest } from "../../../../shared/request-context";
import { InvoicesHttpController } from "./invoices.controller";
import { InvoicesCopilotController } from "./invoices-copilot.controller";
import { InvoicesApplication } from "../../application/invoices.application";
import { CustomersHttpController } from "../../../party/adapters/http/customers.controller";
import { PartyApplication } from "../../../party/application/party.application";
import { PARTY_QUERY_PORT } from "../../../party/application/ports/party-query.port";
import { AuthGuard } from "../../../identity/adapters/http/auth.guard";
import { RbacGuard } from "../../../identity/adapters/http/rbac.guard";
import { GetEffectivePermissionsUseCase } from "../../../identity/application/use-cases/get-effective-permissions.usecase";
import { TenantEntitlementService } from "../../../platform/application/services/tenant-entitlement.service";
import { TenantEntitlement } from "../../../platform/domain/entitlement.aggregate";
import { EntitlementGuard } from "../../../platform/public";
import { DomainExceptionFilter } from "../../../../shared/filters/domain-exception.filter";

// Real RBAC/entitlement HTTP guards; synthetic authentication, grants and command sinks.
// Current membership and tenant/workspace persistence are covered by focused-api-access.int.test.ts.
describe("Invoice supporting HTTP permissions", () => {
  let app: INestApplication;
  const allowed = new Set<string>();
  let invoiceEnabled = true;
  const draft = vi.fn();
  const search = vi.fn();
  const createCustomer = vi.fn();
  const send = vi.fn();
  const liveCustomer = vi.fn();
  beforeEach(async () => {
    vi.clearAllMocks();
    allowed.clear();
    invoiceEnabled = true;
    draft.mockResolvedValue(ok({ subject: "Proposal", body: "Review first" }));
    search.mockResolvedValue(ok({ items: [], nextCursor: null }));
    const module = await Test.createTestingModule({
      controllers: [InvoicesHttpController, InvoicesCopilotController, CustomersHttpController],
      providers: [
        RbacGuard,
        EntitlementGuard,
        {
          provide: InvoicesApplication,
          useValue: {
            getInvoiceById: {
              execute: async () =>
                ok({
                  invoice: {
                    id: "invoice-1",
                    customerPartyId: "customer-1",
                    billToName: "Billing snapshot",
                  },
                }),
            },
            draftInvoiceIssueEmail: { execute: draft },
            draftReminderEmail: { execute: draft },
            sendInvoice: { execute: send },
          },
        },
        {
          provide: PartyApplication,
          useValue: {
            searchCustomers: { execute: search },
            createCustomer: { execute: createCustomer },
            getCustomerById: { execute: liveCustomer },
          },
        },
        { provide: PARTY_QUERY_PORT, useValue: {} },
        {
          provide: GetEffectivePermissionsUseCase,
          useValue: {
            execute: async () => ({
              permissions: { allowed: [...allowed], denied: [], allowAll: false },
            }),
          },
        },
        {
          provide: TenantEntitlementService,
          useValue: {
            getTenantEntitlement: async () =>
              new TenantEntitlement(
                "tenant-a",
                new Set(invoiceEnabled ? ["invoices", "parties"] : ["parties"]),
                new Set()
              ),
          },
        },
      ],
    })
      .overrideGuard(AuthGuard)
      .useValue({
        canActivate: (context: ExecutionContext) => {
          context.switchToHttp().getRequest<ContextAwareRequest>().user = {
            userId: "user-a",
            tenantId: "tenant-a",
            roleIds: [],
          };
          return true;
        },
      })
      .compile();
    app = module.createNestApplication();
    app.useGlobalFilters(new DomainExceptionFilter());
    await app.init();
  });
  afterEach(async () => {
    await app?.close();
  });
  const get = (path: string) =>
    request(app.getHttpServer())
      .get(path)
      .set("x-tenant-id", "tenant-a")
      .set("x-workspace-id", "workspace-a");
  const post = (path: string) =>
    request(app.getHttpServer())
      .post(path)
      .set("x-tenant-id", "tenant-a")
      .set("x-workspace-id", "workspace-a");

  it("returns billing snapshots without retrieving a live customer under invoice-read", async () => {
    allowed.add("sales.invoices.read");
    const response = await get("/invoices/invoice-1").expect(200);
    expect(response.body.invoice).toEqual({
      id: "invoice-1",
      customerPartyId: "customer-1",
      billToName: "Billing snapshot",
    });
    expect(liveCustomer).not.toHaveBeenCalled();
    await get("/customers/search?q=private").expect(403);
    expect(search).not.toHaveBeenCalled();
  });
  it("requires customer-read for lookup and customer-manage for creation", async () => {
    allowed.add("party.customers.read");
    await get("/customers/search?q=Linden&role=CUSTOMER").expect(200);
    expect(search).toHaveBeenCalledWith(
      expect.objectContaining({ q: "Linden", role: "CUSTOMER" }),
      expect.objectContaining({ tenantId: "tenant-a", workspaceId: "workspace-a" })
    );
    await post("/customers").send({}).expect(403);
    expect(createCustomer).not.toHaveBeenCalled();
  });
  it("requires invoice-read and enabled Invoice before drafting on either endpoint", async () => {
    for (const endpoint of ["draft-issue-email", "draft-reminder"]) {
      await post(`/invoices/invoice-1/copilot/${endpoint}`)
        .send({ language: "en", tone: "normal" })
        .expect(403);
    }
    allowed.add("sales.invoices.read");
    invoiceEnabled = false;
    await post("/invoices/invoice-1/copilot/draft-issue-email")
      .send({ language: "en", tone: "friendly" })
      .expect(403);
    expect(draft).not.toHaveBeenCalled();
  });
  it("scopes a permitted draft and independently denies an outbound send", async () => {
    allowed.add("sales.invoices.read");
    await post("/invoices/invoice-1/copilot/draft-issue-email")
      .send({ language: "en", tone: "friendly" })
      .expect(201);
    expect(draft).toHaveBeenCalledWith(
      expect.objectContaining({ invoiceId: "invoice-1" }),
      expect.objectContaining({
        tenantId: "tenant-a",
        workspaceId: "workspace-a",
        userId: "user-a",
      })
    );
    await post("/invoices/invoice-1/send").send({ to: "synthetic@example.invalid" }).expect(403);
    expect(send).not.toHaveBeenCalled();
  });
});
