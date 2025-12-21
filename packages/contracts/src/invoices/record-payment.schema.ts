import { z } from "zod";
import { InvoiceDtoSchema } from "./invoice.types";

export const RecordPaymentInputSchema = z.object({
  invoiceId: z.string(),
  amountCents: z.number().int().positive(),
  paidAt: z.string().optional(),
  note: z.string().optional(),
});

export const RecordPaymentOutputSchema = z.object({
  invoice: InvoiceDtoSchema,
});

export type RecordPaymentInput = z.infer<typeof RecordPaymentInputSchema>;
export type RecordPaymentOutput = z.infer<typeof RecordPaymentOutputSchema>;
