import { describe, it, expect, beforeEach, vi } from "vitest";
import { FakeExpenseRepository } from "../../../testkit/fakes/fake-expense-repo";
import { ArchiveExpenseUseCase } from "../archive-expense.usecase";
import { UnarchiveExpenseUseCase } from "../unarchive-expense.usecase";
import { Expense } from "../../../domain/expense.entity";
import { FixedClock } from "@corely/kernel";

describe("ArchiveExpenseUseCase", () => {
  const tenantId = "t1";
  const userId = "user-1";
  let repo: FakeExpenseRepository;
  let archive: ArchiveExpenseUseCase;
  let unarchive: UnarchiveExpenseUseCase;
  const audit = { log: vi.fn().mockResolvedValue(undefined) };
  const outbox = { enqueue: vi.fn().mockResolvedValue(undefined) };
  const dimensionsWritePort = { deleteEntityAssignments: vi.fn().mockResolvedValue(undefined) };
  const customFieldsWritePort = { deleteEntityValues: vi.fn().mockResolvedValue(undefined) };
  const ctx = { tenantId, userId, requestId: "req-1" } as any;

  beforeEach(() => {
    repo = new FakeExpenseRepository();
    archive = new ArchiveExpenseUseCase(
      repo,
      new FixedClock(new Date("2024-01-01T00:00:00Z")),
      audit as any,
      outbox as any,
      dimensionsWritePort as any,
      customFieldsWritePort as any
    );
    unarchive = new UnarchiveExpenseUseCase(repo, audit as any);
  });

  const buildExpense = () =>
    new Expense(
      "exp-1",
      tenantId,
      "Vendor",
      1000,
      null,
      "EUR",
      null,
      new Date("2024-01-01"),
      userId,
      new Date("2024-01-01")
    );

  it("archives an active expense", async () => {
    const expense = buildExpense();
    await repo.create(expense);

    await archive.execute({ expenseId: expense.id }, ctx);

    const stored = await repo.findById(tenantId, expense.id, { includeArchived: true });
    expect(stored?.archivedAt).toBeInstanceOf(Date);
    expect(stored?.archivedByUserId).toBe(userId);
  });

  it("unarchives an archived expense", async () => {
    const expense = buildExpense();
    expense.archive(new Date("2024-01-02T00:00:00Z"), userId);
    await repo.create(expense);

    await unarchive.execute({ expenseId: expense.id }, ctx);

    const stored = await repo.findById(tenantId, expense.id);
    expect(stored?.archivedAt).toBeNull();
  });

  it("excludes archived from default list", async () => {
    const active = buildExpense();
    const archived = new Expense(
      "exp-2",
      tenantId,
      "Vendor2",
      2000,
      null,
      "EUR",
      null,
      new Date("2024-01-02"),
      userId,
      new Date("2024-01-02")
    );
    archived.archive(new Date("2024-01-02T00:00:00Z"), userId);
    await repo.create(active);
    await repo.create(archived);

    const visible = await repo.list(tenantId, {}, { page: 1, pageSize: 50 });
    expect(visible.items.map((e) => e.id)).toEqual([active.id]);
  });

  it("includes archived when requested", async () => {
    const archived = buildExpense();
    archived.archive(new Date("2024-01-02T00:00:00Z"), userId);
    await repo.create(archived);

    const visible = await repo.list(tenantId, { includeArchived: true }, { page: 1, pageSize: 50 });
    expect(visible.items.map((e) => e.id)).toContain(archived.id);
  });
});
