import { NotFoundError, ValidationFailedError } from "@corely/domain";
import type { UseCaseContext } from "@corely/kernel";
import type { ExpenseRepositoryPort } from "../ports/expense-repository.port";

export interface GetExpenseInput {
  expenseId: string;
  includeArchived?: boolean;
}

export class GetExpenseUseCase {
  constructor(private readonly repo: ExpenseRepositoryPort) {}

  async execute(input: GetExpenseInput, ctx: UseCaseContext) {
    const tenantId = ctx.workspaceId ?? ctx.tenantId;
    if (!tenantId) {
      throw new ValidationFailedError("tenantId is required", [
        { message: "tenantId is required", members: ["tenantId"] },
      ]);
    }

    const expense = await this.repo.findById(tenantId, input.expenseId, {
      includeArchived: input.includeArchived,
    });
    if (!expense) {
      throw new NotFoundError("Expense not found");
    }
    return expense;
  }
}
