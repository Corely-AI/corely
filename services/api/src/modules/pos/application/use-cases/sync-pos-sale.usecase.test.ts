import { describe, expect, it, vi } from "vitest";
import { ok, type UseCaseContext } from "@corely/kernel";
import type { SyncPosSaleOutput } from "@corely/contracts";
import type { PosSaleIdempotencyPort } from "../ports/pos-sale-idempotency.port";
import { SyncPosSaleUseCase } from "./sync-pos-sale.usecase";
import { AddEntryUseCase } from "../../../cash-management/application/use-cases/add-entry.usecase";
import { ResolveCashDrawerForPosRegisterService } from "../services/resolve-cash-drawer-for-pos-register.service";

const createPosCtx = (): UseCaseContext => ({
  tenantId: "workspace-1",
  workspaceId: "workspace-1",
  userId: "user-1",
  requestId: "req-1",
  correlationId: "corr-1",
  metadata: {
    permissions: ["*"],
    platformTenantId: "tenant-1",
  },
});

const syncInput = {
  posSaleId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  workspaceId: "workspace-1",
  sessionId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
  registerId: "11111111-1111-1111-1111-111111111111",
  saleDate: new Date("2026-03-25T12:00:00.000Z"),
  cashierEmployeePartyId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
  customerPartyId: null,
  lineItems: [
    {
      lineItemId: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
      productId: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
      productName: "Pho Bo",
      sku: "PHO-BO",
      quantity: 1,
      unitPriceCents: 1290,
      discountCents: 0,
      lineTotalCents: 1290,
    },
  ],
  cartDiscountCents: 0,
  subtotalCents: 1290,
  taxCents: 0,
  totalCents: 1290,
  payments: [
    {
      paymentId: "ffffffff-ffff-4fff-8fff-ffffffffffff",
      method: "CASH" as const,
      amountCents: 1290,
      reference: null,
    },
  ],
  idempotencyKey: "sale-idem-1",
};

describe("SyncPosSaleUseCase", () => {
  it("records cash against the mapped cash drawer instead of the POS register ID", async () => {
    const idempotencyStore: PosSaleIdempotencyPort = {
      get: vi.fn().mockResolvedValue(null),
      store: vi.fn().mockResolvedValue(undefined),
    };
    const addCashEntry = {
      execute: vi.fn().mockResolvedValue(ok({ entry: { id: "entry-1" } })),
    } satisfies Pick<AddEntryUseCase, "execute">;
    const resolveCashDrawer = {
      execute: vi.fn().mockResolvedValue(
        ok({
          cashDrawerId: "cash-1",
          resolution: "bound" as const,
          posRegister: { id: syncInput.registerId },
          scope: {
            posWorkspaceId: "workspace-1",
            cashTenantId: "tenant-1",
            cashManagementContext: {
              ...createPosCtx(),
              tenantId: "tenant-1",
              workspaceId: "workspace-1",
            },
          },
        })
      ),
    } satisfies Pick<ResolveCashDrawerForPosRegisterService, "execute">;

    const useCase = new SyncPosSaleUseCase(
      idempotencyStore,
      addCashEntry as unknown as AddEntryUseCase,
      resolveCashDrawer as unknown as ResolveCashDrawerForPosRegisterService
    );

    const result = await useCase.execute(syncInput, createPosCtx());

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error("Expected sync to succeed");
    }

    expect(resolveCashDrawer.execute).toHaveBeenCalledTimes(1);
    expect(addCashEntry.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        registerId: "cash-1",
        idempotencyKey: "sale-idem-1:cash:0",
      }),
      expect.objectContaining({
        tenantId: "tenant-1",
        workspaceId: "workspace-1",
      })
    );
    expect(idempotencyStore.store).toHaveBeenCalledTimes(1);
  });

  it("returns the cached idempotent result without touching cash drawer resolution", async () => {
    const cached: SyncPosSaleOutput = {
      ok: true,
      serverInvoiceId: "12121212-1212-4212-8212-121212121212",
      serverPaymentId: "34343434-3434-4434-8434-343434343434",
      receiptNumber: "POS-CACHED-1",
    };
    const idempotencyStore: PosSaleIdempotencyPort = {
      get: vi.fn().mockResolvedValue(cached),
      store: vi.fn().mockResolvedValue(undefined),
    };
    const addCashEntry = {
      execute: vi.fn(),
    } satisfies Pick<AddEntryUseCase, "execute">;
    const resolveCashDrawer = {
      execute: vi.fn(),
    } satisfies Pick<ResolveCashDrawerForPosRegisterService, "execute">;

    const useCase = new SyncPosSaleUseCase(
      idempotencyStore,
      addCashEntry as unknown as AddEntryUseCase,
      resolveCashDrawer as unknown as ResolveCashDrawerForPosRegisterService
    );

    const result = await useCase.execute(syncInput, createPosCtx());

    expect(result).toEqual(ok(cached));
    expect(resolveCashDrawer.execute).not.toHaveBeenCalled();
    expect(addCashEntry.execute).not.toHaveBeenCalled();
    expect(idempotencyStore.store).not.toHaveBeenCalled();
  });

  it("accepts an HTTP-style saleDate string and normalizes it before receipt generation", async () => {
    const idempotencyStore: PosSaleIdempotencyPort = {
      get: vi.fn().mockResolvedValue(null),
      store: vi.fn().mockResolvedValue(undefined),
    };
    const addCashEntry = {
      execute: vi.fn().mockResolvedValue(ok({ entry: { id: "entry-1" } })),
    } satisfies Pick<AddEntryUseCase, "execute">;
    const resolveCashDrawer = {
      execute: vi.fn().mockResolvedValue(
        ok({
          cashDrawerId: "cash-1",
          resolution: "bound" as const,
          posRegister: { id: syncInput.registerId },
          scope: {
            posWorkspaceId: "workspace-1",
            cashTenantId: "tenant-1",
            cashManagementContext: {
              ...createPosCtx(),
              tenantId: "tenant-1",
              workspaceId: "workspace-1",
            },
          },
        })
      ),
    } satisfies Pick<ResolveCashDrawerForPosRegisterService, "execute">;

    const useCase = new SyncPosSaleUseCase(
      idempotencyStore,
      addCashEntry as unknown as AddEntryUseCase,
      resolveCashDrawer as unknown as ResolveCashDrawerForPosRegisterService
    );

    const result = await useCase.execute(
      {
        ...syncInput,
        saleDate: "2026-03-25T12:00:00.000Z" as unknown as Date,
      },
      createPosCtx()
    );

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error("Expected sync to succeed");
    }

    expect(result.value.receiptNumber).toContain("20260325");
    expect(addCashEntry.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        businessDate: "2026-03-25",
      }),
      expect.anything()
    );
  });
});
