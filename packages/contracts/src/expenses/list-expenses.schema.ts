import { z } from "zod";
import { ExpenseDtoSchema, ExpenseStatusSchema } from "./expense.types";
import { localDateSchema } from "../shared/local-date.schema";
import { ListQuerySchema, PageInfoSchema } from "../common/list.contract";
import {
  DimensionFilterSchema,
  CustomFieldFilterSchema,
} from "../common/customization/custom-attributes";

const JsonArrayParamSchema = <T extends z.ZodTypeAny>(itemSchema: T) =>
  z
    .union([z.string(), z.array(itemSchema)])
    .optional()
    .transform((value) => {
      if (!value) {
        return undefined;
      }
      if (typeof value === "string") {
        try {
          const parsed = JSON.parse(value);
          return Array.isArray(parsed) ? parsed : undefined;
        } catch {
          return undefined;
        }
      }
      return value;
    })
    .pipe(z.array(itemSchema).optional());

export const ListExpensesInputSchema = ListQuerySchema.extend({
  status: ExpenseStatusSchema.optional(),
  category: z.string().optional(),
  merchantName: z.string().optional(),
  fromDate: localDateSchema.optional(),
  toDate: localDateSchema.optional(),
  includeArchived: z.boolean().optional(),
  cursor: z.string().optional(),
  dimensionFilters: JsonArrayParamSchema(DimensionFilterSchema),
  customFieldFilters: JsonArrayParamSchema(CustomFieldFilterSchema),
  // Override pageSize to match specific max constraints if needed, or stick to ListQuery defaults
});

export const ListExpensesOutputSchema = z.object({
  items: z.array(ExpenseDtoSchema),
  nextCursor: z.string().optional().nullable(),
  pageInfo: PageInfoSchema.optional(), // Make optional during migration or if cursor-based
});

export type ListExpensesInput = z.infer<typeof ListExpensesInputSchema>;
export type ListExpensesOutput = z.infer<typeof ListExpensesOutputSchema>;
