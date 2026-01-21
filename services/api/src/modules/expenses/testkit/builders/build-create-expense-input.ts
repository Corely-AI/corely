import { type CreateExpenseInput } from "../../application/use-cases/create-expense.usecase";
import { buildRequestContext } from "../../../../shared/context/request-context";

export const buildCreateExpenseInput = (
  overrides: Partial<CreateExpenseInput> = {}
): CreateExpenseInput => {
  return {
    tenantId: "tenant-1",
    merchant: "Coffee Shop",
    totalCents: 500,
    currency: "USD",
    category: "Meals",
    issuedAt: new Date("2023-01-01T00:00:00.000Z"),
    createdByUserId: "user-1",
    idempotencyKey: "expense-1",
    // context removed as it is passed separately
    ...overrides,
  };
};
