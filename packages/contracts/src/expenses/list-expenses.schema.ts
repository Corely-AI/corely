import { z } from "zod";
import { ExpenseDtoSchema, ExpenseStatusSchema } from "./expense.types";
import { localDateSchema } from "../shared/local-date.schema";

export const ListExpensesInputSchema = z.object({
  status: ExpenseStatusSchema.optional(),
  category: z.string().optional(),
  merchantName: z.string().optional(),
  fromDate: localDateSchema.optional(),
  toDate: localDateSchema.optional(),
  includeArchived: z.boolean().optional(),
  cursor: z.string().optional(),
  pageSize: z.number().int().positive().max(100).optional(),
});

export const ListExpensesOutputSchema = z.object({
  items: z.array(ExpenseDtoSchema),
  nextCursor: z.string().optional().nullable(),
});

export type ListExpensesInput = z.infer<typeof ListExpensesInputSchema>;
export type ListExpensesOutput = z.infer<typeof ListExpensesOutputSchema>;
