import { z } from "zod";
import { ExpenseDtoSchema } from "./expense.types";

export const SubmitExpenseInputSchema = z.object({
  expenseId: z.string(),
});

export const SubmitExpenseOutputSchema = z.object({
  expense: ExpenseDtoSchema,
});

export type SubmitExpenseInput = z.infer<typeof SubmitExpenseInputSchema>;
export type SubmitExpenseOutput = z.infer<typeof SubmitExpenseOutputSchema>;
