import { describe, expect, it, vi } from "vitest";
import {
  CashDayCloseStatus,
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
import type { IdempotencyStoragePort } from "@/shared/ports/idempotency-storage.port";
import { CreateCashEntryUseCase } from "../application/use-cases/create-cash-entry.usecase";
import { ReverseCashEntryUseCase } from "../application/use-cases/reverse-cash-entry.usecase";
import { GetCashDashboardQueryUseCase } from "../application/use-cases/get-cash-dashboard.query";
import { SaveCashDayCountUseCase } from "../application/use-cases/save-cash-day-count.usecase";
import { SubmitCashDayCloseUseCase } from "../application/use-cases/submit-cash-day-close.usecase";
import type {
  CashAttachmentRepoPort,
  CashDayCloseRepoPort,
  CashEntryRepoPort,
  CashExportRepoPort,
  CashRegisterRepoPort,
} from "../application/ports/cash-management.ports";
import type { CashDayCloseEntity, CashEntryEntity, CashRegisterEntity } from "../domain/entities";

const createCtx = (): UseCaseContext => ({
  tenantId: "tenant-1",
  workspaceId: "ws-1",
  userId: "user-1",
  metadata: { permissions: ["*"] },
});

const makeUnitOfWork = (): UnitOfWorkPort => ({
  withinTransaction: async <T>(fn: (tx: TransactionContext) => Promise<T>): Promise<T> =>
    fn({} as TransactionContext),
});

const makeAudit = (): AuditPort => ({
  log: vi.fn(async () => {}),
});

const makeOutbox = (): OutboxPort => ({
  enqueue: vi.fn(async () => {}),
});

class InMemoryIdempotencyStore implements IdempotencyStoragePort {
  private storeMap = new Map<string, { body: unknown; statusCode?: number }>();

  async get(actionKey: string, tenantId: string | null, key: string) {
    return this.storeMap.get(`${actionKey}:${tenantId ?? "null"}:${key}`) ?? null;
  }

  async store(
    actionKey: string,
    tenantId: string | null,
    key: string,
    response: { statusCode?: number; body: unknown }
  ) {
    this.storeMap.set(`${actionKey}:${tenantId ?? "null"}:${key}`, response);
  }
}

const baseRegister: CashRegisterEntity = {
  id: "reg-1",
  tenantId: "tenant-1",
  workspaceId: "ws-1",
  name: "Main",
  location: null,
  currency: "EUR",
  currentBalanceCents: 10000,
  disallowNegativeBalance: false,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const baseEntry: CashEntryEntity = {
  id: "entry-1",
  tenantId: "tenant-1",
  workspaceId: "ws-1",
  registerId: "reg-1",
  entryNo: 1,
  occurredAt: new Date("2026-02-27T09:00:00.000Z"),
  dayKey: "2026-02-27",
  description: "Sale",
  type: CashEntryType.SALE_CASH,
  direction: CashEntryDirection.IN,
  source: CashEntrySource.MANUAL,
  paymentMethod: CashPaymentMethod.CASH,
  amountCents: 2500,
  currency: "EUR",
  balanceAfterCents: 10000,
  referenceId: null,
  reversalOfEntryId: null,
  reversedByEntryId: null,
  lockedByDayCloseId: null,
  createdAt: new Date("2026-02-27T09:00:00.000Z"),
  createdByUserId: "user-1",
};

describe("cash-management use cases", () => {
  it("reversal creates a new entry and marks original as reversed", async () => {
    const entries: CashEntryEntity[] = [{ ...baseEntry }];
    let registerBalance = 10000;

    const registerRepo: CashRegisterRepoPort = {
      createRegister: async () => baseRegister,
      listRegisters: async () => [baseRegister],
      findRegisterById: async () => ({ ...baseRegister, currentBalanceCents: registerBalance }),
      updateRegister: async () => baseRegister,
      setCurrentBalance: async (_tenantId, _workspaceId, _registerId, value) => {
        registerBalance = value;
      },
    };

    const entryRepo: CashEntryRepoPort = {
      nextEntryNo: async () => 2,
      createEntry: async (data) => {
        const created: CashEntryEntity = {
          ...baseEntry,
          ...data,
          id: "entry-reversal-1",
          createdAt: new Date(),
        };
        entries.push(created);
        return created;
      },
      listEntries: async () => entries,
      findEntryById: async (_tenantId, _workspaceId, entryId) =>
        entries.find((entry) => entry.id === entryId) ?? null,
      setReversedByEntryId: async (_tenantId, _workspaceId, entryId, reversedByEntryId) => {
        const target = entries.find((entry) => entry.id === entryId);
        if (target) {
          target.reversedByEntryId = reversedByEntryId;
        }
      },
      listEntriesForMonth: async () => entries,
      getExpectedBalanceAtDay: async () => 10000,
      lockEntriesForDay: async () => {},
    };

    const dayCloseRepo: CashDayCloseRepoPort = {
      findDayCloseByRegisterAndDay: async () => null,
      upsertDayClose: async () => {
        throw new Error("not used");
      },
      replaceCountLines: async () => {},
      listDayCloses: async () => [],
      listDayClosesForMonth: async () => [],
    };

    const useCase = new ReverseCashEntryUseCase(
      registerRepo,
      entryRepo,
      dayCloseRepo,
      makeAudit(),
      makeOutbox(),
      makeUnitOfWork(),
      new InMemoryIdempotencyStore()
    );

    const result = await useCase.execute(
      {
        entryId: "entry-1",
        reason: "Wrong amount",
        idempotencyKey: "reverse-1",
      },
      createCtx()
    );

    expect(result.ok).toBe(true);
    expect(entries).toHaveLength(2);
    expect(entries[0].reversedByEntryId).toBe("entry-reversal-1");
    expect(entries[1].direction).toBe(CashEntryDirection.OUT);
    expect(entries[1].reversalOfEntryId).toBe("entry-1");
    expect(registerBalance).toBe(7500);
  });

  it("day close with difference creates closing adjustment entry", async () => {
    const createdEntries: CashEntryEntity[] = [];
    let registerBalance = 10000;
    let persistedClose: CashDayCloseEntity | null = null;
    let persistedCounts: Array<{
      denominationCents: number;
      count: number;
      subtotalCents: number;
    }> = [];

    const registerRepo: CashRegisterRepoPort = {
      createRegister: async () => baseRegister,
      listRegisters: async () => [baseRegister],
      findRegisterById: async () => ({ ...baseRegister, currentBalanceCents: registerBalance }),
      updateRegister: async () => baseRegister,
      setCurrentBalance: async (_tenantId, _workspaceId, _registerId, value) => {
        registerBalance = value;
      },
    };

    const entryRepo: CashEntryRepoPort = {
      nextEntryNo: async () => 2,
      createEntry: async (data) => {
        const created: CashEntryEntity = {
          ...baseEntry,
          ...data,
          id: `entry-${createdEntries.length + 2}`,
          createdAt: new Date(),
        };
        createdEntries.push(created);
        return created;
      },
      listEntries: async () => createdEntries,
      findEntryById: async () => null,
      setReversedByEntryId: async () => {},
      listEntriesForMonth: async () => createdEntries,
      getExpectedBalanceAtDay: async () => 10000,
      lockEntriesForDay: async () => {},
    };

    const dayCloseRepo: CashDayCloseRepoPort = {
      findDayCloseByRegisterAndDay: async () => persistedClose,
      upsertDayClose: async (data) => {
        persistedClose = {
          id: data.id ?? "close-1",
          tenantId: data.tenantId,
          workspaceId: data.workspaceId,
          registerId: data.registerId,
          dayKey: data.dayKey,
          expectedBalanceCents: data.expectedBalanceCents,
          countedBalanceCents: data.countedBalanceCents,
          differenceCents: data.differenceCents,
          status: data.status,
          note: data.note,
          submittedAt: data.submittedAt,
          submittedByUserId: data.submittedByUserId,
          lockedAt: data.lockedAt,
          lockedByUserId: data.lockedByUserId,
          counts: persistedCounts.map((line) => ({
            denominationCents: line.denominationCents,
            count: line.count,
            subtotalCents: line.subtotalCents,
          })),
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        return persistedClose;
      },
      replaceCountLines: async (_tenantId, _workspaceId, _dayCloseId, lines) => {
        persistedCounts = lines;
      },
      listDayCloses: async () => (persistedClose ? [persistedClose] : []),
      listDayClosesForMonth: async () => (persistedClose ? [persistedClose] : []),
    };

    const useCase = new SubmitCashDayCloseUseCase(
      registerRepo,
      entryRepo,
      dayCloseRepo,
      makeAudit(),
      makeOutbox(),
      makeUnitOfWork(),
      new InMemoryIdempotencyStore()
    );

    const result = await useCase.execute(
      {
        registerId: "reg-1",
        dayKey: "2026-02-27",
        countedBalanceCents: 9500,
        denominationCounts: [{ denomination: 500, count: 19, subtotal: 9500 }],
        note: "Difference noted",
        idempotencyKey: "close-1",
      },
      createCtx()
    );

    expect(result.ok).toBe(true);
    expect(createdEntries).toHaveLength(1);
    expect(createdEntries[0].type).toBe(CashEntryType.CLOSING_ADJUSTMENT);
    expect(createdEntries[0].direction).toBe(CashEntryDirection.OUT);
    expect(createdEntries[0].amountCents).toBe(500);
    expect(registerBalance).toBe(9500);
    expect(persistedCounts).toEqual([{ denominationCents: 500, count: 19, subtotalCents: 9500 }]);
  });

  it("saves counted cash as a draft without locking the day", async () => {
    let persistedClose: CashDayCloseEntity | null = null;
    let persistedCounts: Array<{
      denominationCents: number;
      count: number;
      subtotalCents: number;
    }> = [];

    const registerRepo: CashRegisterRepoPort = {
      createRegister: async () => baseRegister,
      listRegisters: async () => [baseRegister],
      findRegisterById: async () => baseRegister,
      updateRegister: async () => baseRegister,
      setCurrentBalance: async () => {},
    };

    const entryRepo: CashEntryRepoPort = {
      nextEntryNo: async () => 2,
      createEntry: async () => baseEntry,
      listEntries: async () => [baseEntry],
      findEntryById: async () => baseEntry,
      setReversedByEntryId: async () => {},
      listEntriesForMonth: async () => [baseEntry],
      getExpectedBalanceAtDay: async () => 10000,
      lockEntriesForDay: async () => {},
    };

    const dayCloseRepo: CashDayCloseRepoPort = {
      findDayCloseByRegisterAndDay: async () => persistedClose,
      upsertDayClose: async (data) => {
        persistedClose = {
          id: data.id ?? "draft-close-1",
          tenantId: data.tenantId,
          workspaceId: data.workspaceId,
          registerId: data.registerId,
          dayKey: data.dayKey,
          expectedBalanceCents: data.expectedBalanceCents,
          countedBalanceCents: data.countedBalanceCents,
          differenceCents: data.differenceCents,
          status: data.status,
          note: data.note,
          submittedAt: data.submittedAt,
          submittedByUserId: data.submittedByUserId,
          lockedAt: data.lockedAt,
          lockedByUserId: data.lockedByUserId,
          counts: persistedCounts.map((line) => ({
            denominationCents: line.denominationCents,
            count: line.count,
            subtotalCents: line.subtotalCents,
          })),
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        return persistedClose;
      },
      replaceCountLines: async (_tenantId, _workspaceId, _dayCloseId, lines) => {
        persistedCounts = lines;
      },
      listDayCloses: async () => (persistedClose ? [persistedClose] : []),
      listDayClosesForMonth: async () => (persistedClose ? [persistedClose] : []),
    };

    const useCase = new SaveCashDayCountUseCase(
      registerRepo,
      entryRepo,
      dayCloseRepo,
      makeAudit(),
      makeUnitOfWork()
    );

    const result = await useCase.execute(
      {
        registerId: "reg-1",
        dayKey: "2026-02-27",
        countedBalanceCents: 9950,
        note: "Drawer short before recount",
        denominationCounts: [{ denomination: 5000, count: 1, subtotal: 5000 }],
      },
      createCtx()
    );

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.value.dayClose.status).toBe(CashDayCloseStatus.DRAFT);
    expect(result.value.dayClose.countedBalance).toBe(9950);
    expect(result.value.dayClose.difference).toBe(-50);
    expect(result.value.dayClose.lockedAt).toBeNull();
    expect(persistedCounts).toEqual([{ denominationCents: 5000, count: 1, subtotalCents: 5000 }]);
  });

  it("blocks normal entry posting when day is already closed", async () => {
    const registerRepo: CashRegisterRepoPort = {
      createRegister: async () => baseRegister,
      listRegisters: async () => [baseRegister],
      findRegisterById: async () => baseRegister,
      updateRegister: async () => baseRegister,
      setCurrentBalance: async () => {},
    };

    const entryRepo: CashEntryRepoPort = {
      nextEntryNo: async () => 2,
      createEntry: async () => {
        throw new Error("should not be called");
      },
      listEntries: async () => [],
      findEntryById: async () => null,
      setReversedByEntryId: async () => {},
      listEntriesForMonth: async () => [],
      getExpectedBalanceAtDay: async () => 10000,
      lockEntriesForDay: async () => {},
    };

    const dayCloseRepo: CashDayCloseRepoPort = {
      findDayCloseByRegisterAndDay: async () => ({
        id: "close-1",
        tenantId: "tenant-1",
        workspaceId: "ws-1",
        registerId: "reg-1",
        dayKey: "2026-02-27",
        expectedBalanceCents: 10000,
        countedBalanceCents: 10000,
        differenceCents: 0,
        status: CashDayCloseStatus.SUBMITTED,
        note: null,
        submittedAt: new Date(),
        submittedByUserId: "user-1",
        lockedAt: new Date(),
        lockedByUserId: "user-1",
        counts: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
      upsertDayClose: async () => {
        throw new Error("not used");
      },
      replaceCountLines: async () => {},
      listDayCloses: async () => [],
      listDayClosesForMonth: async () => [],
    };

    const useCase = new CreateCashEntryUseCase(
      registerRepo,
      entryRepo,
      dayCloseRepo,
      makeAudit(),
      makeOutbox(),
      makeUnitOfWork(),
      new InMemoryIdempotencyStore()
    );

    const result = await useCase.execute(
      {
        registerId: "reg-1",
        type: CashEntryType.SALE_CASH,
        direction: CashEntryDirection.IN,
        amountCents: 1000,
        description: "Late sale",
        paymentMethod: CashPaymentMethod.CASH,
        source: CashEntrySource.MANUAL,
        dayKey: "2026-02-27",
        idempotencyKey: "entry-closed",
      },
      createCtx()
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("CashManagement:DayAlreadyClosed");
    }
  });

  it("builds a live dashboard summary from register activity", async () => {
    const registerRepo: CashRegisterRepoPort = {
      createRegister: async () => baseRegister,
      listRegisters: async () => [baseRegister],
      findRegisterById: async () => baseRegister,
      updateRegister: async () => baseRegister,
      setCurrentBalance: async () => {},
    };

    const todayIncome: CashEntryEntity = {
      ...baseEntry,
      id: "entry-income",
      description: "Cash sale",
      amountCents: 3000,
      balanceAfterCents: 13000,
    };

    const todayExpense: CashEntryEntity = {
      ...baseEntry,
      id: "entry-expense",
      entryNo: 2,
      description: "Acetone refill",
      type: CashEntryType.EXPENSE_CASH,
      direction: CashEntryDirection.OUT,
      amountCents: 800,
      balanceAfterCents: 12200,
    };

    const previousMonthEntry: CashEntryEntity = {
      ...baseEntry,
      id: "entry-prev-month",
      dayKey: "2026-01-31",
      occurredAt: new Date("2026-01-31T12:00:00.000Z"),
    };

    const entryRepo: CashEntryRepoPort = {
      nextEntryNo: async () => 3,
      createEntry: async () => baseEntry,
      listEntries: async (_tenantId, _workspaceId, filters) => {
        if (filters.dayKeyFrom === "2026-02-27" && filters.dayKeyTo === "2026-02-27") {
          return [todayIncome, todayExpense];
        }
        return [];
      },
      findEntryById: async () => null,
      setReversedByEntryId: async () => {},
      listEntriesForMonth: async (_tenantId, _workspaceId, _registerId, month) => {
        if (month === "2026-02") {
          return [todayIncome, todayExpense];
        }
        return [previousMonthEntry];
      },
      getExpectedBalanceAtDay: async () => 12200,
      lockEntriesForDay: async () => {},
    };

    const dayCloseRepo: CashDayCloseRepoPort = {
      findDayCloseByRegisterAndDay: async () => ({
        id: "close-1",
        tenantId: "tenant-1",
        workspaceId: "ws-1",
        registerId: "reg-1",
        dayKey: "2026-02-27",
        expectedBalanceCents: 12200,
        countedBalanceCents: 12200,
        differenceCents: 0,
        status: CashDayCloseStatus.DRAFT,
        note: null,
        submittedAt: null,
        submittedByUserId: null,
        lockedAt: null,
        lockedByUserId: null,
        counts: [],
        createdAt: new Date("2026-02-27T18:00:00.000Z"),
        updatedAt: new Date("2026-02-27T18:00:00.000Z"),
      }),
      upsertDayClose: async () => {
        throw new Error("not used");
      },
      replaceCountLines: async () => {},
      listDayCloses: async () => [
        {
          id: "close-prev",
          tenantId: "tenant-1",
          workspaceId: "ws-1",
          registerId: "reg-1",
          dayKey: "2026-02-26",
          expectedBalanceCents: 10000,
          countedBalanceCents: 10000,
          differenceCents: 0,
          status: CashDayCloseStatus.SUBMITTED,
          note: null,
          submittedAt: new Date("2026-02-26T19:00:00.000Z"),
          submittedByUserId: "user-9",
          lockedAt: new Date("2026-02-26T19:00:00.000Z"),
          lockedByUserId: "user-9",
          counts: [],
          createdAt: new Date("2026-02-26T19:00:00.000Z"),
          updatedAt: new Date("2026-02-26T19:00:00.000Z"),
        },
      ],
      listDayClosesForMonth: async () => [],
    };

    const attachmentRepo: CashAttachmentRepoPort = {
      createAttachment: async () => {
        throw new Error("not used");
      },
      findAttachmentByEntryAndDocument: async () => null,
      listAttachments: async () => [],
      listAttachmentsForMonth: async () => [
        {
          id: "attachment-1",
          tenantId: "tenant-1",
          workspaceId: "ws-1",
          entryId: "entry-expense",
          documentId: "doc-1",
          uploadedByUserId: "user-1",
          createdAt: new Date("2026-02-27T12:00:00.000Z"),
        },
      ],
    };

    const exportRepo: CashExportRepoPort = {
      createArtifact: async () => {
        throw new Error("not used");
      },
      findArtifactById: async () => null,
      findLatestArtifact: async () => null,
      listAuditRowsForMonth: async () => [],
    };

    const useCase = new GetCashDashboardQueryUseCase(
      registerRepo,
      entryRepo,
      dayCloseRepo,
      attachmentRepo,
      exportRepo
    );

    const result = await useCase.execute(
      {
        registerId: "reg-1",
        dayKey: "2026-02-27",
      },
      createCtx()
    );

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.value.dashboard.status.dayStatus).toBe("ready-to-close");
    expect(result.value.dashboard.status.missingReceiptsToday).toBe(0);
    expect(result.value.dashboard.summary.expectedClosingCents).toBe(12200);
    expect(result.value.dashboard.recentEntries).toHaveLength(2);
  });
});
