import { describe, expect, it, vi } from "vitest";
import { HttpError } from "@corely/api-client";
import type { PosApiClient } from "@/lib/pos-api-client";
import { PosSyncTransport } from "@/lib/offline/posSyncTransport";
import type { PosLocalService } from "@/services/posLocalService";
import { PosLocalServiceWeb } from "@/services/posLocalServiceWeb";

const FIXTURE_IDS = {
  workspaceId: "2f00417b-b4d9-4bd5-a2d9-0d0e68221601",
  registerId: "ca9b267f-50e9-4e4e-830d-e83f2c7e4ec0",
  shiftSessionId: "7f4a5af8-c14a-411f-9050-04253f89c049",
  cashierUserId: "50c01ad4-c5d3-4bc6-9e12-3e7f53ef1502",
  customerId: "4b875de2-e2ce-4582-a1db-30735f786195",
  lineItemId: "419808ba-1869-47ea-b53e-0ee0efc17930",
  productId: "f4af671d-0e48-4bb7-bdcf-1db8d7d7f909",
  paymentId: "c0a4e69b-5311-4270-9d22-a0f20b57f702",
  serverInvoiceId: "45fe4f78-63ef-4ef7-a42b-388387ff7bc4",
  serverPaymentId: "599f801a-e95f-43cc-acc6-aa69b17f6e14",
} as const;

function createApiClientStub(overrides: Partial<PosApiClient>): PosApiClient {
  return overrides as PosApiClient;
}

async function createQueuedLocalSale(localService: PosLocalServiceWeb) {
  return localService.createSaleAndEnqueue({
    workspaceId: FIXTURE_IDS.workspaceId,
    registerId: FIXTURE_IDS.registerId,
    sessionId: FIXTURE_IDS.shiftSessionId,
    cashierEmployeePartyId: FIXTURE_IDS.cashierUserId,
    customerPartyId: FIXTURE_IDS.customerId,
    cartDiscountCents: 0,
    taxCents: 220,
    notes: "Offline fallback sale",
    lineItems: [
      {
        lineItemId: FIXTURE_IDS.lineItemId,
        productId: FIXTURE_IDS.productId,
        productName: "Margherita Pizza",
        sku: "PIZZA-001",
        quantity: 1,
        unitPriceCents: 1_100,
        discountCents: 0,
      },
    ],
    payments: [
      {
        paymentId: FIXTURE_IDS.paymentId,
        method: "CARD",
        amountCents: 1_320,
        reference: "offline-terminal-001",
      },
    ],
  });
}

describe("POS offline sync fallback", () => {
  it("captures a local sale offline, preserves a deterministic idempotency key, and syncs safely without duplicate server application", async () => {
    const localService = new PosLocalServiceWeb();
    const { sale, command } = await createQueuedLocalSale(localService);
    const appliedKeys = new Set<string>();
    let serverApplications = 0;

    const syncPosSale = vi.fn(async (payload: { idempotencyKey: string }) => {
      if (!appliedKeys.has(payload.idempotencyKey)) {
        appliedKeys.add(payload.idempotencyKey);
        serverApplications += 1;
      }

      return {
        ok: true,
        serverInvoiceId: FIXTURE_IDS.serverInvoiceId,
        serverPaymentId: FIXTURE_IDS.serverPaymentId,
      };
    });

    const transport = new PosSyncTransport({
      apiClient: createApiClientStub({ syncPosSale }),
      posLocalService: localService as unknown as PosLocalService,
    });

    expect(sale.status).toBe("PENDING_SYNC");
    expect(command.idempotencyKey).toBe(`sale:${sale.posSaleId}:finalize:v1`);

    const firstResult = await transport.executeCommand(command);
    const duplicateResult = await transport.executeCommand(command);

    expect(firstResult.status).toBe("OK");
    expect(duplicateResult.status).toBe("OK");
    expect(syncPosSale).toHaveBeenCalledTimes(2);
    expect(serverApplications).toBe(1);
    expect(syncPosSale.mock.calls[0]?.[0].idempotencyKey).toBe(command.idempotencyKey);
    expect(syncPosSale.mock.calls[1]?.[0].idempotencyKey).toBe(command.idempotencyKey);

    const syncedSale = await localService.getSaleById(sale.posSaleId);
    expect(syncedSale?.status).toBe("SYNCED");
    expect(syncedSale?.serverInvoiceId).toBe(FIXTURE_IDS.serverInvoiceId);
    expect(syncedSale?.serverPaymentId).toBe(FIXTURE_IDS.serverPaymentId);
    expect(syncedSale?.syncError).toBeNull();
  });

  it("surfaces backend conflicts explicitly when queued sync cannot be applied safely", async () => {
    const localService = new PosLocalServiceWeb();
    const { sale, command } = await createQueuedLocalSale(localService);
    const syncPosSale = vi.fn(async () => {
      throw new HttpError("Conflict", 409, {
        type: "https://errors.corely.one/Common:Conflict",
        title: "Conflict",
        status: 409,
        detail: "Sale was already finalized differently on the server",
        instance: "/api/pos/sales/sync",
        code: "Common:Conflict",
        traceId: "offline-sync-trace-001",
      });
    });

    const transport = new PosSyncTransport({
      apiClient: createApiClientStub({ syncPosSale }),
      posLocalService: localService as unknown as PosLocalService,
    });

    const result = await transport.executeCommand(command);

    expect(result.status).toBe("CONFLICT");
    expect(result.conflict?.message).toContain("Conflict");
    expect(result.conflict?.serverState).toMatchObject({
      code: "Common:Conflict",
      detail: "Sale was already finalized differently on the server",
    });

    const failedSale = await localService.getSaleById(sale.posSaleId);
    expect(failedSale?.status).toBe("FAILED");
    expect(failedSale?.syncError).toContain("Conflict");
  });

  it("treats client-side programming errors as fatal instead of infinitely retryable", async () => {
    const localService = new PosLocalServiceWeb();
    const { sale, command } = await createQueuedLocalSale(localService);
    const syncPosSale = vi.fn(async () => {
      throw new TypeError("payload.totalCents is undefined");
    });

    const transport = new PosSyncTransport({
      apiClient: createApiClientStub({ syncPosSale }),
      posLocalService: localService as unknown as PosLocalService,
    });

    const result = await transport.executeCommand(command);

    expect(result.status).toBe("FATAL_ERROR");
    expect(result.error).toContain("payload.totalCents is undefined");

    const failedSale = await localService.getSaleById(sale.posSaleId);
    expect(failedSale?.status).toBe("FAILED");
    expect(failedSale?.syncError).toContain("payload.totalCents is undefined");
  });

  it("keeps 5xx server failures retryable", async () => {
    const localService = new PosLocalServiceWeb();
    const { command } = await createQueuedLocalSale(localService);
    const syncPosSale = vi.fn(async () => {
      throw new HttpError("Service Unavailable", 503, {
        code: "Common:ServiceUnavailable",
      });
    });

    const transport = new PosSyncTransport({
      apiClient: createApiClientStub({ syncPosSale }),
      posLocalService: localService as unknown as PosLocalService,
    });

    const result = await transport.executeCommand(command);

    expect(result.status).toBe("RETRYABLE_ERROR");
  });
});
