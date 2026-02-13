import { z } from "zod";
import { localDateSchema } from "../shared/local-date.schema";
import { ExpenseDtoSchema } from "./expense.types";
import { EntityDimensionAssignmentSchema } from "../common/customization/custom-attributes";

export const UpdateExpenseInputSchema = z.object({
  expenseId: z.string(),
  expenseDate: localDateSchema.optional(),
  merchantName: z.string().optional(),
  supplierPartyId: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  category: z.string().optional().nullable(),
  custom: z.record(z.any()).optional(),
  customFieldValues: z.record(z.any()).optional(),
  dimensionAssignments: z.array(EntityDimensionAssignmentSchema).optional(),
});

export const UpdateExpenseOutputSchema = z.object({
  expense: ExpenseDtoSchema,
});

export type UpdateExpenseInput = z.infer<typeof UpdateExpenseInputSchema>;
export type UpdateExpenseOutput = z.infer<typeof UpdateExpenseOutputSchema>;
