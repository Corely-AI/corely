import { describe, expect, it, vi } from "vitest";
import { ok } from "@corely/kernel";
import { PosSaleRecord } from "../../domain/pos-sale-record.entity";
import type { PosSaleRepositoryPort } from "../ports/pos-sale-repository.port";
import { GetPosTransactionUseCase } from "./get-pos-transaction.usecase";

const ctx = {
  tenantId: "workspace-1",
  workspaceId: "workspace-1",
  userId: "user-1",
  requestId: "req-1",
  correlationId: "corr-1",
};

const record = new PosSaleRecord(
  "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  "workspace-1",
  "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
  "11111111-1111-1111-1111-111111111111",
  "Front Counter",
  "POS-001",
  new Date("2026-03-25T10:14:00.000Z"),
  "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
  null,
  2140,
  214,
  2354,
  "EUR",
  "SYNCED",
  [],
  [],
  "sale-idem-1",
  "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
  "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
  new Date("2026-03-25T10:15:00.000Z"),
  new Date("2026-03-25T10:15:00.000Z"),
  new Date("2026-03-25T10:15:00.000Z")
);

describe("GetPosTransactionUseCase", () => {
  it("returns the full transaction detail dto", async () => {
    const repo: PosSaleRepositoryPort = {
      upsert: vi.fn(),
      list: vi.fn(),
      findById: vi.fn().mockResolvedValue(record),
    };
    const useCase = new GetPosTransactionUseCase(repo);

    const result = await useCase.execute(
      { transactionId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" },
      ctx
    );

    expect(result).toEqual(
      ok({
        transaction: expect.objectContaining({
          transactionId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
          receiptNumber: "POS-001",
          idempotencyKey: "sale-idem-1",
        }),
      })
    );
    expect(repo.findById).toHaveBeenCalledWith(
      "workspace-1",
      "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"
    );
  });

  it("returns a not found error when the transaction does not exist in the workspace", async () => {
    const repo: PosSaleRepositoryPort = {
      upsert: vi.fn(),
      list: vi.fn(),
      findById: vi.fn().mockResolvedValue(null),
    };
    const useCase = new GetPosTransactionUseCase(repo);

    const result = await useCase.execute(
      { transactionId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" },
      ctx
    );

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("Expected missing transaction to fail");
    }

    expect(result.error.code).toBe("Pos:TransactionNotFound");
  });
});
