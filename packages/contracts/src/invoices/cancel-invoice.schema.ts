import { z } from "zod";
import { InvoiceDtoSchema } from "./invoice.types";

export const CancelInvoiceInputSchema = z.object({
  invoiceId: z.string(),
  reason: z.string().optional(),
});

export const CancelInvoiceOutputSchema = z.object({
  invoice: InvoiceDtoSchema,
});

export type CancelInvoiceInput = z.infer<typeof CancelInvoiceInputSchema>;
export type CancelInvoiceOutput = z.infer<typeof CancelInvoiceOutputSchema>;
