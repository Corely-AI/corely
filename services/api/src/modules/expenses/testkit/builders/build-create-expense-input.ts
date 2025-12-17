import { CreateExpenseInput } from "../../application/use-cases/CreateExpenseUseCase";
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
    context: buildRequestContext({ tenantId: "tenant-1", actorUserId: "user-1" }),
    ...overrides,
  };
};
