import { z } from "zod";
import { ExpenseDtoSchema } from "./expense.types";

export const AttachReceiptInputSchema = z.object({
  expenseId: z.string(),
  documentId: z.string(),
});

export const AttachReceiptOutputSchema = z.object({
  expense: ExpenseDtoSchema,
});

export type AttachReceiptInput = z.infer<typeof AttachReceiptInputSchema>;
export type AttachReceiptOutput = z.infer<typeof AttachReceiptOutputSchema>;
