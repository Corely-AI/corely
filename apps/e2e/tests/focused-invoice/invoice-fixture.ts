import type { BrowserContext } from "@playwright/test";
import {
  InvoiceDtoSchema,
  InvoiceCapabilitiesSchema,
  RequestInvoicePdfOutputSchema,
  type InvoiceDto,
} from "@corely/contracts";
import {
  workspaceFixtureResponse,
  fixtureOrigins,
} from "../../../../packages/web-shared/testkit/workspace-api-fixture";

const date = "2026-11-09T10:00:00Z";
export function invoiceFixture(id = "invoice-1"): InvoiceDto {
  return InvoiceDtoSchema.parse({
    id,
    tenantId: "tenant-a",
    number: "INV-2026-101",
    status: "DRAFT",
    customerPartyId: "customer-1",
    billToName: "Linden Customer",
    currency: "EUR",
    invoiceDate: "2026-11-09",
    dueDate: "2026-11-30",
    issuedAt: null,
    sentAt: null,
    createdAt: date,
    updatedAt: date,
    lineItems: [{ id: "line-1", description: "Consulting package", qty: 2, unitPriceCents: 15000 }],
    totals: {
      subtotalCents: 30000,
      taxCents: 5700,
      discountCents: 0,
      totalCents: 35700,
      paidCents: 0,
      dueCents: 35700,
    },
  });
}
export async function invoiceTransport(
  context: BrowserContext,
  options: {
    empty?: boolean;
    denied?: boolean;
    fail?: boolean;
    loading?: boolean;
    pdf?: boolean;
    issued?: boolean;
    customerDenied?: boolean;
    customerFail?: boolean;
    copilotFail?: boolean;
    sendDenied?: boolean;
  } = {}
) {
  let invoice = invoiceFixture();
  if (options.issued) {
    invoice = { ...invoice, status: "ISSUED" };
  }
  if (options.pdf) {
    invoice = { ...invoice, legalEntityId: "legal-1", paymentMethodId: null };
  }
  const commands: Array<{ path: string; body: unknown; headers: Record<string, string> }> = [];
  const requests: string[] = [];
  let releaseList = () => {};
  const heldList = new Promise<void>((resolve) => {
    releaseList = resolve;
  });
  await context.route("**/api/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname;
    const headers = await request.allHeaders();
    requests.push(path);
    if (path.startsWith("/api/bff/payment-methods")) {
      // The real Invoice BFF does not expose the legacy settings API.
      await route.fulfill({ status: 403, json: {} });
      return;
    }
    if (options.denied && path === "/api/session/user" && headers["x-workspace-id"]) {
      await route.fulfill({ status: 403, json: {} });
      return;
    }
    if (path.startsWith("/api/bff/invoices")) {
      if (headers["x-tenant-id"] !== "tenant-a" || headers["x-workspace-id"] !== "workspace-a") {
        await route.fulfill({ status: 403, json: {} });
        return;
      }
      if (options.loading && path === "/api/bff/invoices") {
        await heldList;
      }
      if (options.fail) {
        await route.fulfill({ status: 400, json: {} });
        return;
      }
      if (path.includes("missing")) {
        await route.fulfill({ status: 404, json: {} });
        return;
      }
      if (options.pdf && path.endsWith("/pdf")) {
        await route.fulfill({
          json: RequestInvoicePdfOutputSchema.parse({
            documentId: "document-1",
            status: "READY",
            downloadUrl: "http://127.0.0.1:5188/pdf-fixture",
          }),
        });
        return;
      }
      if (path.includes("/copilot/")) {
        commands.push({ path, body: request.postDataJSON(), headers });
        await route.fulfill(
          options.copilotFail
            ? { status: 503, json: { message: "Synthetic assistant unavailable" } }
            : {
                json: {
                  subject: "Invoice proposal",
                  body: "Review this synthetic draft before sending.",
                },
              }
        );
        return;
      }
      if (request.method() !== "GET") {
        const body: unknown = request.postDataJSON();
        commands.push({ path, body, headers });
        if (path.endsWith("/send") && options.sendDenied) {
          await route.fulfill({ status: 403, json: {} });
          return;
        }
        if (path.endsWith("/finalize")) {
          invoice = { ...invoice, status: "ISSUED" };
        } else if (path === "/api/bff/invoices") {
          invoice = { ...invoice, id: "created-1", status: "DRAFT" };
        }
        await route.fulfill({ json: { invoice } });
        return;
      }
      await route.fulfill({
        json:
          path === "/api/bff/invoices"
            ? {
                items: options.empty ? [] : [invoice],
                pageInfo: { page: 1, pageSize: 20, total: 1, hasNextPage: false },
              }
            : {
                invoice,
                ...(options.pdf || options.issued
                  ? {
                      capabilities: InvoiceCapabilitiesSchema.parse({
                        status: { value: invoice.status, label: "Draft", tone: "muted" },
                        badges: [],
                        transitions: [],
                        actions: [
                          {
                            key: options.issued ? "send" : "download_pdf",
                            label: options.issued ? "Send invoice" : "Download PDF",
                            placement: "primary",
                            enabled: true,
                            dangerous: false,
                          },
                        ],
                        editability: {
                          canEditHeader: true,
                          canEditDates: true,
                          canEditLineItems: true,
                        },
                        audit: { trackChanges: true },
                      }),
                    }
                  : {}),
              },
      });
      return;
    }
    if (path === "/api/bff/customers/search") {
      if (options.customerDenied || options.customerFail) {
        await route.fulfill({ status: options.customerDenied ? 403 : 400, json: {} });
        return;
      }
      const remote = url.searchParams.get("q")?.includes("Remote");
      const more = url.searchParams.has("cursor");
      await route.fulfill({
        json: {
          items: [
            {
              id: remote ? "customer-remote" : more ? "customer-2" : "customer-1",
              displayName: remote
                ? "Remote Customer"
                : more
                  ? "Second Customer"
                  : "Linden Customer",
              email: "synthetic@example.invalid",
            },
          ],
          nextCursor: !remote && !more ? "page-2" : null,
        },
      });
      return;
    }
    if (path === "/api/bff/customers" && request.method() === "POST") {
      const body: unknown = request.postDataJSON();
      commands.push({ path, body, headers });
      await route.fulfill({ json: { id: "new-customer", displayName: "New Synthetic Customer" } });
      return;
    }
    const response = workspaceFixtureResponse(
      path + url.search,
      new Headers(headers),
      "user-a",
      "invoice",
      fixtureOrigins("5188")
    );
    await route.fulfill({ status: response.status, json: await response.json() });
  });
  return {
    commands,
    requests,
    releaseList,
    recover: () => {
      options.fail = false;
      options.customerFail = false;
    },
  };
}
