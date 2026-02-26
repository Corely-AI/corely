import { describe, expect, it, vi } from "vitest";
import {
  InMemoryIdempotency,
  NoopLogger,
  type AuditPort,
  type OutboxPort,
  isErr,
} from "@corely/kernel";
import { CreateLoyaltyRedeemEntryUseCase } from "./create-loyalty-redeem.usecase";
import type { LoyaltyRepositoryPort } from "../ports/loyalty-repository.port";

const buildLoyaltyRepo = (): LoyaltyRepositoryPort => {
  const account = {
    loyaltyAccountId: "loyalty-1",
    tenantId: "tenant-1",
    customerPartyId: "customer-1",
    status: "ACTIVE" as const,
    currentPointsBalance: 5,
    lifetimeEarnedPoints: 20,
    tier: null,
    createdAt: new Date("2026-02-01T00:00:00.000Z"),
    updatedAt: new Date("2026-02-01T00:00:00.000Z"),
  };

  return {
    getAccountByCustomer: vi.fn(async () => account),
    upsertAccount: vi.fn(async () => account),
    updateAccountBalance: vi.fn(async () => undefined),
    createLedgerEntry: vi.fn(async () => undefined),
    findLedgerEntryBySource: vi.fn(async () => null),
    listLedger: vi.fn(async () => ({ items: [], nextCursor: null })),
  };
};

describe("CreateLoyaltyRedeemEntryUseCase", () => {
  it("rejects redemption when requested points exceed current balance", async () => {
    const loyalty = buildLoyaltyRepo();
    const audit: AuditPort = { log: vi.fn(async () => undefined) };
    const outbox: OutboxPort = { enqueue: vi.fn(async () => undefined) };

    const useCase = new CreateLoyaltyRedeemEntryUseCase({
      logger: new NoopLogger(),
      loyalty,
      idempotency: new InMemoryIdempotency(),
      audit,
      outbox,
    });

    const result = await useCase.execute(
      {
        idempotencyKey: "idem-redeem-1",
        entryId: "11111111-1111-4111-8111-111111111111",
        customerPartyId: "customer-1",
        pointsDelta: 6,
        reason: null,
        sourceType: null,
        sourceId: null,
        createdByEmployeePartyId: null,
      },
      {
        tenantId: "tenant-1",
        workspaceId: "workspace-1",
        userId: "user-1",
      }
    );

    expect(isErr(result)).toBe(true);
    if (!isErr(result)) {
      throw new Error("Expected use case to fail");
    }

    expect(result.error.code).toBe("LOYALTY_INSUFFICIENT_BALANCE");
    expect(loyalty.createLedgerEntry).not.toHaveBeenCalled();
    expect(loyalty.updateAccountBalance).not.toHaveBeenCalled();
    expect(audit.log).not.toHaveBeenCalled();
    expect(outbox.enqueue).not.toHaveBeenCalled();
  });
});
