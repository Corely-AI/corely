import { z } from "zod";
import { ExpenseDtoSchema, ExpenseLineSchema } from "./expense.types";

export const UpdateExpenseLineInputSchema = z.object({
  expenseId: z.string(),
  lineId: z.string(),
  description: z.string().optional(),
  quantity: z.number().int().positive().optional(),
  unitPriceCents: z.number().int().optional(),
  taxRate: z.number().optional().nullable(),
  category: z.string().optional().nullable(),
});

export const UpdateExpenseLineOutputSchema = z.object({
  expense: ExpenseDtoSchema,
  line: ExpenseLineSchema,
});

export type UpdateExpenseLineInput = z.infer<typeof UpdateExpenseLineInputSchema>;
export type UpdateExpenseLineOutput = z.infer<typeof UpdateExpenseLineOutputSchema>;
