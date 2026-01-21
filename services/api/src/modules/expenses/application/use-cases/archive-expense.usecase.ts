import { Injectable } from "@nestjs/common";
import { ForbiddenError, NotFoundError } from "@corely/domain";
import type { UseCaseContext } from "@corely/kernel";
import type { ExpenseRepositoryPort } from "../ports/expense-repository.port";
import type { ClockPort } from "../../../../shared/ports/clock.port";
import type { AuditPort } from "../../../../shared/ports/audit.port";
import { assertCan } from "../../../../shared/policies/assert-can";

export interface ArchiveExpenseInput {
  expenseId: string;
}

@Injectable()
export class ArchiveExpenseUseCase {
  constructor(
    private readonly repo: ExpenseRepositoryPort,
    private readonly clock: ClockPort,
    private readonly audit: AuditPort
  ) {}

  async execute(input: ArchiveExpenseInput, ctx: UseCaseContext): Promise<void> {
    assertCan(ctx);
    const tenantId = ctx.tenantId;
    if (!tenantId) {
      throw new ForbiddenError("Tenant is required");
    }
    const expense = await this.repo.findById(tenantId, input.expenseId, { includeArchived: true });
    if (!expense) {
      throw new NotFoundError("Expense not found");
    }
    if (expense.archivedAt) {
      return;
    }
    expense.archive(this.clock.now(), ctx.userId ?? "system");
    await this.repo.update(expense);
    await this.audit.log({
      tenantId,
      userId: ctx.userId ?? "system",
      action: "expense.archived",
      entityType: "Expense",
      entityId: expense.id,
      metadata: {},
    });
  }
}
