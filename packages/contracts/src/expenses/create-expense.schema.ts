import { z } from "zod";
import { localDateSchema } from "../shared/local-date.schema";
import { ExpenseDtoSchema } from "./expense.types";
import { EntityDimensionAssignmentSchema } from "../common/customization/custom-attributes";

export const CreateExpenseInputSchema = z.object({
  expenseDate: localDateSchema,
  merchantName: z.string().optional(),
  supplierPartyId: z.string().optional(),
  currency: z.string(),
  notes: z.string().optional(),
  category: z.string().optional(),
  custom: z.record(z.any()).optional(),
  customFieldValues: z.record(z.any()).optional(),
  dimensionAssignments: z.array(EntityDimensionAssignmentSchema).optional(),
  idempotencyKey: z.string().optional(),
});

export const CreateExpenseOutputSchema = z.object({
  expense: ExpenseDtoSchema,
});

export type CreateExpenseInput = z.infer<typeof CreateExpenseInputSchema>;
export type CreateExpenseOutput = z.infer<typeof CreateExpenseOutputSchema>;
