import { describe, expect, it, vi } from "vitest";
import { ok, type UseCaseContext } from "@corely/kernel";
import type { ListPosTransactionsInput } from "@corely/contracts";
import { PosSaleRecord } from "../../domain/pos-sale-record.entity";
import type { PosSaleRepositoryPort } from "../ports/pos-sale-repository.port";
import { ListPosTransactionsUseCase } from "./list-pos-transactions.usecase";

const createCtx = (): UseCaseContext => ({
  tenantId: "workspace-1",
  workspaceId: "workspace-1",
  userId: "user-1",
  requestId: "req-1",
  correlationId: "corr-1",
});

const createRecord = (overrides: Partial<PosSaleRecord> = {}) =>
  new PosSaleRecord(
    overrides.id ?? "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    overrides.workspaceId ?? "workspace-1",
    overrides.sessionId ?? "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    overrides.registerId ?? "11111111-1111-1111-1111-111111111111",
    overrides.registerName ?? "Front Counter",
    overrides.receiptNumber ?? "POS-001",
    overrides.saleDate ?? new Date("2026-03-25T10:14:00.000Z"),
    overrides.cashierEmployeePartyId ?? "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
    overrides.customerPartyId ?? null,
    overrides.subtotalCents ?? 2140,
    overrides.taxCents ?? 214,
    overrides.totalCents ?? 2354,
    overrides.currency ?? "EUR",
    overrides.status ?? "SYNCED",
    overrides.lineItems ?? [],
    overrides.payments ?? [],
    overrides.idempotencyKey ?? "sale-idem-1",
    overrides.serverInvoiceId ?? "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
    overrides.serverPaymentId ?? "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
    overrides.syncedAt ?? new Date("2026-03-25T10:15:00.000Z"),
    overrides.createdAt ?? new Date("2026-03-25T10:15:00.000Z"),
    overrides.updatedAt ?? new Date("2026-03-25T10:15:00.000Z")
  );

describe("ListPosTransactionsUseCase", () => {
  it("returns workspace-scoped transaction summaries with page metadata", async () => {
    const repo: PosSaleRepositoryPort = {
      upsert: vi.fn(),
      findById: vi.fn(),
      list: vi.fn().mockResolvedValue({
        items: [createRecord()],
        total: 1,
      }),
    };
    const useCase = new ListPosTransactionsUseCase(repo);
    const input: ListPosTransactionsInput = {
      page: 2,
      pageSize: 10,
      q: "POS-001",
    };

    const result = await useCase.execute(input, createCtx());

    expect(result).toEqual(
      ok({
        items: [
          expect.objectContaining({
            transactionId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
            receiptNumber: "POS-001",
            registerName: "Front Counter",
          }),
        ],
        pageInfo: {
          page: 2,
          pageSize: 10,
          total: 1,
          hasNextPage: false,
        },
      })
    );
    expect(repo.list).toHaveBeenCalledWith("workspace-1", input);
  });
});
