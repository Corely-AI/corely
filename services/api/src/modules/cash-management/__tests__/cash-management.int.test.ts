import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { PostgresTestDb } from "@corely/testkit";
import { createTenant, createTestDb, createWorkspace, stopSharedContainer } from "@corely/testkit";
import {
  CashEntryDirection,
  CashEntrySource,
  CashEntryType,
  CashPaymentMethod,
} from "@corely/contracts";
import type {
  AuditPort,
  OutboxPort,
  TransactionContext,
  UnitOfWorkPort,
  UseCaseContext,
} from "@corely/kernel";
import type { PrismaService } from "@corely/data";
import type { IdempotencyStoragePort } from "@/shared/ports/idempotency-storage.port";
import { SubmitCashDayCloseUseCase } from "../application/use-cases/submit-cash-day-close.usecase";
import { PrismaCashRepository } from "../infrastructure/adapters/prisma-cash-repository.adapter";

vi.setConfig({ hookTimeout: 120_000, testTimeout: 120_000 });

class InMemoryIdempotencyStore implements IdempotencyStoragePort {
  private map = new Map<string, { body: unknown; statusCode?: number }>();

  async get(actionKey: string, tenantId: string | null, key: string) {
    return this.map.get(`${actionKey}:${tenantId ?? "null"}:${key}`) ?? null;
  }

  async store(
    actionKey: string,
    tenantId: string | null,
    key: string,
    response: { body: unknown; statusCode?: number }
  ) {
    this.map.set(`${actionKey}:${tenantId ?? "null"}:${key}`, response);
  }
}

const createCtx = (tenantId: string, workspaceId: string): UseCaseContext => ({
  tenantId,
  workspaceId,
  userId: "cash-user",
  metadata: { permissions: ["*"] },
});

describe("cash-management Prisma integration", () => {
  let db: PostgresTestDb;
  let tenantId: string;
  let workspaceId: string;
  let repo: PrismaCashRepository;

  beforeAll(async () => {
    db = await createTestDb();
    repo = new PrismaCashRepository(db.client as unknown as PrismaService);
  });

  beforeEach(async () => {
    await db.reset();
    const tenant = await createTenant(db.client, { name: "Tenant A" });
    tenantId = tenant.id;
    const workspace = await createWorkspace(db.client, tenantId, { name: "Workspace A" });
    workspaceId = workspace.id;
  });

  afterAll(async () => {
    await db.down();
    await stopSharedContainer();
  });

  const createUseCase = () => {
    const audit: AuditPort = {
      log: vi.fn(async () => {}),
    };
    const outbox: OutboxPort = {
      enqueue: vi.fn(async () => {}),
    };
    const uow: UnitOfWorkPort = {
      withinTransaction: async <T>(fn: (tx: TransactionContext) => Promise<T>) =>
        db.client.$transaction((tx) => fn(tx as unknown as TransactionContext)),
    };
    return new SubmitCashDayCloseUseCase(
      repo,
      repo,
      repo,
      audit,
      outbox,
      uow,
      new InMemoryIdempotencyStore()
    );
  };

  const seedRegisterWithEntry = async () => {
    const register = await repo.createRegister({
      tenantId,
      workspaceId,
      name: "Main Register",
      location: "Desk",
      currency: "EUR",
      disallowNegativeBalance: false,
    });

    await repo.createEntry({
      tenantId,
      workspaceId,
      registerId: register.id,
      entryNo: 1,
      occurredAt: new Date("2026-02-27T08:00:00.000Z"),
      dayKey: "2026-02-27",
      description: "Opening",
      type: CashEntryType.OPENING_FLOAT,
      direction: CashEntryDirection.IN,
      source: CashEntrySource.MANUAL,
      paymentMethod: CashPaymentMethod.CASH,
      amountCents: 10000,
      currency: "EUR",
      balanceAfterCents: 10000,
      referenceId: null,
      reversalOfEntryId: null,
      lockedByDayCloseId: null,
      createdByUserId: "cash-user",
    });

    await repo.setCurrentBalance(tenantId, workspaceId, register.id, 10000);
    return register.id;
  };

  it("submit day close stores denomination lines", async () => {
    const registerId = await seedRegisterWithEntry();
    const useCase = createUseCase();

    const result = await useCase.execute(
      {
        registerId,
        dayKey: "2026-02-27",
        countedBalanceCents: 10000,
        denominationCounts: [
          { denomination: 500, count: 20, subtotal: 10000 },
          { denomination: 200, count: 0, subtotal: 0 },
        ],
        idempotencyKey: "close-1",
      },
      createCtx(tenantId, workspaceId)
    );

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    const dayCloseId = result.value.dayClose.id as string;
    const lines = await db.client.cashDayCloseCountLine.findMany({
      where: { tenantId, workspaceId, dayCloseId },
      orderBy: { denominationCents: "asc" },
    });

    expect(lines).toHaveLength(2);
    expect(lines[0]).toMatchObject({ denominationCents: 200, count: 0, subtotalCents: 0 });
    expect(lines[1]).toMatchObject({ denominationCents: 500, count: 20, subtotalCents: 10000 });
  });

  it("submit day close is idempotent for repeated key", async () => {
    const registerId = await seedRegisterWithEntry();
    const useCase = createUseCase();
    const ctx = createCtx(tenantId, workspaceId);

    const input = {
      registerId,
      dayKey: "2026-02-27",
      countedBalanceCents: 10000,
      denominationCounts: [{ denomination: 500, count: 20, subtotal: 10000 }],
      idempotencyKey: "close-dup",
    };

    const first = await useCase.execute(input, ctx);
    const second = await useCase.execute(input, ctx);

    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
    if (!first.ok || !second.ok) {
      return;
    }

    expect(second.value.dayClose.id).toBe(first.value.dayClose.id);

    const dayCloses = await db.client.cashDayClose.findMany({
      where: { tenantId, workspaceId, registerId, dayKey: "2026-02-27" },
    });
    const lines = await db.client.cashDayCloseCountLine.findMany({
      where: { tenantId, workspaceId, dayCloseId: first.value.dayClose.id as string },
    });

    expect(dayCloses).toHaveLength(1);
    expect(lines).toHaveLength(1);
  });
});
