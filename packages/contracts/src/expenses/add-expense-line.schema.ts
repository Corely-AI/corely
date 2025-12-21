import { z } from "zod";
import { ExpenseDtoSchema, ExpenseLineSchema } from "./expense.types";

export const AddExpenseLineInputSchema = z.object({
  expenseId: z.string(),
  description: z.string(),
  quantity: z.number().int().positive().default(1),
  unitPriceCents: z.number().int(),
  taxRate: z.number().optional().nullable(),
  category: z.string().optional().nullable(),
});

export const AddExpenseLineOutputSchema = z.object({
  expense: ExpenseDtoSchema,
  line: ExpenseLineSchema,
});

export type AddExpenseLineInput = z.infer<typeof AddExpenseLineInputSchema>;
export type AddExpenseLineOutput = z.infer<typeof AddExpenseLineOutputSchema>;
