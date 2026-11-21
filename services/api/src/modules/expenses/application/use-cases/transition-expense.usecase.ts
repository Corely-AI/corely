import { Injectable } from "@nestjs/common";
import {
  EXPENSE_SUBMISSION_POLICY_REJECTED,
  expenseSubmissionRejection,
  type ExpenseSubmissionRegistration,
} from "@corely/expenses/extensions";
import { ValidationError } from "@corely/kernel";
import { ConflictError, ForbiddenError, NotFoundError } from "@corely/domain";
import type { OutboxPort, UseCaseContext } from "@corely/kernel";
import type { ExpenseRepositoryPort } from "../ports/expense-repository.port";
import type { AuditPort } from "../../../../shared/ports/audit.port";
import { assertCan } from "../../../../shared/policies/assert-can";
import type { ExpenseStatus } from "../../domain/expense.entity";

export interface TransitionExpenseInput {
  expenseId: string;
  to: ExpenseStatus;
  reason?: string;
}

@Injectable()
export class TransitionExpenseUseCase {
  constructor(
    private readonly repo: Pick<ExpenseRepositoryPort, "findById" | "update">,
    private readonly audit: AuditPort,
    private readonly outbox: OutboxPort,
    private readonly policies: readonly ExpenseSubmissionRegistration[] = []
  ) {}

  async execute(input: TransitionExpenseInput, ctx: UseCaseContext): Promise<void> {
    assertCan(ctx);
    const tenantId = ctx.tenantId;

    if (!tenantId) {
      throw new ForbiddenError("Tenant is required");
    }

    const { workspaceId } = ctx;
    const expense =
      (await this.repo.findById(workspaceId ?? tenantId, input.expenseId)) ??
      (workspaceId && workspaceId !== tenantId
        ? await this.repo.findById(tenantId, input.expenseId)
        : null);
    if (!expense) {
      throw new NotFoundError("Expense not found");
    }

    if (expense.archivedAt) {
      throw new ConflictError("Cannot transition an archived expense");
    }

    const oldStatus = expense.status;

    // Status transition validation logic
    if (oldStatus === input.to) {
      return; // already in target status
    }

    if (input.to === "SUBMITTED" && workspaceId && expense.tenantId === workspaceId) {
      const rejection = expenseSubmissionRejection(
        this.policies,
        { tenantId, workspaceId },
        { category: expense.category }
      );
      if (rejection) {
        throw new ValidationError(rejection, undefined, EXPENSE_SUBMISSION_POLICY_REJECTED);
      }
    }

    // Typical flow: DRAFT -> SUBMITTED -> APPROVED -> PAID
    // REJECTED can happen from SUBMITTED
    expense.updateStatus(input.to);

    await this.repo.update(expense);

    await this.audit.log({
      tenantId,
      userId: ctx.userId ?? "system",
      action: "expense.transitioned",
      entityType: "Expense",
      entityId: expense.id,
      metadata: {
        from: oldStatus,
        to: input.to,
        reason: input.reason,
      },
    });

    await this.outbox.enqueue({
      tenantId,
      eventType: "expense.status_changed",
      payload: {
        tenantId,
        entityType: "expense",
        entityId: expense.id,
        newStatus: input.to,
        oldStatus,
      },
    });
  }
}
