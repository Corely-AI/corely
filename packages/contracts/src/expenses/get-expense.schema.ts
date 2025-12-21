import { z } from "zod";
import { ExpenseDtoSchema } from "./expense.types";

export const GetExpenseInputSchema = z.object({
  expenseId: z.string(),
});

export const GetExpenseOutputSchema = z.object({
  expense: ExpenseDtoSchema,
});

export type GetExpenseInput = z.infer<typeof GetExpenseInputSchema>;
export type GetExpenseOutput = z.infer<typeof GetExpenseOutputSchema>;
