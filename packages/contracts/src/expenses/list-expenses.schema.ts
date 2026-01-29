import { z } from "zod";
import { ExpenseDtoSchema, ExpenseStatusSchema } from "./expense.types";
import { localDateSchema } from "../shared/local-date.schema";
import { ListQuerySchema, PageInfoSchema } from "../common/list.contract";

export const ListExpensesInputSchema = ListQuerySchema.extend({
  status: ExpenseStatusSchema.optional(),
  category: z.string().optional(),
  merchantName: z.string().optional(),
  fromDate: localDateSchema.optional(),
  toDate: localDateSchema.optional(),
  includeArchived: z.boolean().optional(),
  cursor: z.string().optional(),
  // Override pageSize to match specific max constraints if needed, or stick to ListQuery defaults
});

export const ListExpensesOutputSchema = z.object({
  items: z.array(ExpenseDtoSchema),
  nextCursor: z.string().optional().nullable(),
  pageInfo: PageInfoSchema.optional(), // Make optional during migration or if cursor-based
});

export type ListExpensesInput = z.infer<typeof ListExpensesInputSchema>;
export type ListExpensesOutput = z.infer<typeof ListExpensesOutputSchema>;
