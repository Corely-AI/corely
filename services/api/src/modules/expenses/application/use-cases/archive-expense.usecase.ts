import { Injectable } from "@nestjs/common";
import { ForbiddenError, NotFoundError } from "@corely/domain";
import type { OutboxPort, UseCaseContext } from "@corely/kernel";
import type { ExpenseRepositoryPort } from "../ports/expense-repository.port";
import type { ClockPort } from "../../../../shared/ports/clock.port";
import type { AuditPort } from "../../../../shared/ports/audit.port";
import { assertCan } from "../../../../shared/policies/assert-can";
import type {
  CustomFieldsWritePort,
  DimensionsWritePort,
} from "../../../platform-custom-attributes/application/ports/custom-attributes.ports";

export interface ArchiveExpenseInput {
  expenseId: string;
}

@Injectable()
export class ArchiveExpenseUseCase {
  constructor(
    private readonly repo: ExpenseRepositoryPort,
    private readonly clock: ClockPort,
    private readonly audit: AuditPort,
    private readonly outbox: OutboxPort,
    private readonly dimensionsWritePort: DimensionsWritePort,
    private readonly customFieldsWritePort: CustomFieldsWritePort
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

    await this.dimensionsWritePort.deleteEntityAssignments(tenantId, "expense", expense.id);
    await this.customFieldsWritePort.deleteEntityValues(tenantId, "expense", expense.id);
    await this.outbox.enqueue({
      tenantId,
      eventType: "platform.entity.deleted",
      payload: {
        tenantId,
        entityType: "expense",
        entityId: expense.id,
      },
    });
  }
}
