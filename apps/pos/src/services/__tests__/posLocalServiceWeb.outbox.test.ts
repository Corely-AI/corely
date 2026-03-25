import { beforeEach, describe, expect, it, vi } from "vitest";
import { PosCommandTypes } from "@/offline/posOutbox";
import { PosLocalServiceWeb } from "@/services/posLocalServiceWeb";

const { enqueueMock, getOutboxStoreMock } = vi.hoisted(() => ({
  enqueueMock: vi.fn(async () => undefined),
  getOutboxStoreMock: vi.fn(async () => ({
    enqueue: enqueueMock,
  })),
}));

vi.mock("@/lib/offline/outboxStore", () => ({
  getOutboxStore: getOutboxStoreMock,
}));

describe("PosLocalServiceWeb outbox persistence", () => {
  beforeEach(() => {
    enqueueMock.mockClear();
    getOutboxStoreMock.mockClear();
  });

  it("persists shift-open commands so web sync can flush them", async () => {
    const service = new PosLocalServiceWeb();

    const session = await service.openShiftAndEnqueue({
      workspaceId: "workspace-1",
      registerId: "register-1",
      openedByEmployeePartyId: "user-1",
      startingCashCents: 20_000,
      notes: "Open for lunch",
    });

    expect(session.status).toBe("OPEN");
    expect(getOutboxStoreMock).toHaveBeenCalledTimes(1);
    expect(enqueueMock).toHaveBeenCalledTimes(1);
    const calls = enqueueMock.mock.calls as unknown as Array<
      [{ workspaceId: string; type: string; status: string; payload: Record<string, unknown> }]
    >;
    const persisted = calls[0][0];
    expect(persisted).toBeDefined();
    expect(persisted).toMatchObject({
      workspaceId: "workspace-1",
      type: PosCommandTypes.ShiftOpen,
      status: "PENDING",
      payload: {
        sessionId: session.sessionId,
        registerId: "register-1",
        openedByEmployeePartyId: "user-1",
        startingCashCents: 20_000,
        notes: "Open for lunch",
      },
    });
  });

  it("persists sale-finalize commands so sync now can send web checkout sales", async () => {
    const service = new PosLocalServiceWeb();

    const result = await service.createSaleAndEnqueue({
      workspaceId: "workspace-1",
      registerId: "register-1",
      sessionId: "shift-1",
      cashierEmployeePartyId: "cashier-1",
      customerPartyId: null,
      cartDiscountCents: 0,
      taxCents: 120,
      notes: null,
      lineItems: [
        {
          lineItemId: "line-1",
          productId: "product-1",
          productName: "Pho",
          sku: "PHO-1",
          quantity: 1,
          unitPriceCents: 1_200,
          discountCents: 0,
        },
      ],
      payments: [
        {
          paymentId: "payment-1",
          method: "CASH",
          amountCents: 1_320,
          reference: null,
        },
      ],
    });

    expect(result.sale.status).toBe("PENDING_SYNC");
    expect(enqueueMock).toHaveBeenCalledTimes(1);
    const calls = enqueueMock.mock.calls as unknown as Array<
      [{ workspaceId: string; type: string; status: string; payload: Record<string, unknown> }]
    >;
    const persisted = calls[0][0];
    expect(persisted).toBeDefined();
    expect(persisted).toMatchObject({
      workspaceId: "workspace-1",
      type: PosCommandTypes.SaleFinalize,
      status: "PENDING",
      payload: {
        posSaleId: result.sale.posSaleId,
        registerId: "register-1",
        sessionId: "shift-1",
        workspaceId: "workspace-1",
      },
    });
  });
});
