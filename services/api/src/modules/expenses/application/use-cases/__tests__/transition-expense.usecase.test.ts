import { describe, expect, it, vi } from "vitest";
import { Expense } from "../../../domain/expense.entity";
import { TransitionExpenseUseCase } from "../transition-expense.usecase";

const scope = { tenantId: "tenant-1", workspaceId: "workspace-1", userId: "owner" };
const now = new Date("2026-01-01T00:00:00Z");

function setup(recordScope: string, category: string | null = null) {
  const expense = new Expense(
    "expense-1",
    recordScope,
    "DRAFT",
    "Example shop",
    1000,
    null,
    "EUR",
    category,
    now,
    "owner",
    now
  );
  const repo = {
    findById: vi.fn(async (key: string) => (key === recordScope ? expense : null)),
    update: vi.fn(async () => {}),
  };
  const audit = { log: vi.fn(async () => {}) };
  const outbox = { enqueue: vi.fn(async () => {}) };
  const transition = new TransitionExpenseUseCase(repo, audit, outbox, [
    { ...scope, check: ({ category }) => (category?.trim() ? undefined : "Select a category.") },
  ]);
  return { expense, repo, audit, outbox, transition };
}

describe("workspace expense submission", () => {
  it("declines an unclassified draft before writes and allows a categorized retry", async () => {
    const { expense, repo, audit, outbox, transition } = setup(scope.workspaceId);
    const input = { expenseId: expense.id, to: "SUBMITTED" as const };
    await expect(transition.execute(input, scope)).rejects.toMatchObject({
      code: "Expenses:SubmissionPolicyRejected",
    });
    expect(expense.status).toBe("DRAFT");
    expect(repo.update).not.toHaveBeenCalled();
    expect(audit.log).not.toHaveBeenCalled();
    expect(outbox.enqueue).not.toHaveBeenCalled();
    expense.category = "travel";
    await transition.execute(input, scope);
    await transition.execute(input, scope);
    expect(expense.status).toBe("SUBMITTED");
    expect(repo.update).toHaveBeenCalledTimes(1);
    expect(outbox.enqueue).toHaveBeenCalledTimes(1);
  });

  it("does not apply the workspace rule to legacy tenant expenses or a different workspace", async () => {
    const legacy = setup(scope.tenantId);
    await legacy.transition.execute({ expenseId: legacy.expense.id, to: "SUBMITTED" }, scope);
    expect(legacy.expense.status).toBe("SUBMITTED");
    expect(legacy.repo.findById.mock.calls.map(([key]) => key)).toEqual([
      scope.workspaceId,
      scope.tenantId,
    ]);

    const other = setup("workspace-2");
    await other.transition.execute(
      { expenseId: other.expense.id, to: "SUBMITTED" },
      { ...scope, workspaceId: "workspace-2" }
    );
    expect(other.expense.status).toBe("SUBMITTED");
  });

  it("preserves archived expenses and allows non-submission transitions", async () => {
    const archived = setup(scope.workspaceId);
    archived.expense.archive(now, scope.userId);
    await expect(
      archived.transition.execute({ expenseId: archived.expense.id, to: "SUBMITTED" }, scope)
    ).rejects.toThrow("Cannot transition an archived expense");
    expect(archived.repo.update).not.toHaveBeenCalled();

    const other = setup(scope.workspaceId);
    for (const to of ["APPROVED", "PAID"] as const) {
      await other.transition.execute({ expenseId: other.expense.id, to }, scope);
    }
    expect(other.expense.status).toBe("PAID");
  });
});
