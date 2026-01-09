import { z } from "zod";
import { InvoiceDtoSchema } from "./invoice.types";

export const FinalizeInvoiceInputSchema = z.object({
  invoiceId: z.string(),
});

export const FinalizeInvoiceOutputSchema = z.object({
  invoice: InvoiceDtoSchema,
});

export type FinalizeInvoiceInput = z.infer<typeof FinalizeInvoiceInputSchema>;
export type FinalizeInvoiceOutput = z.infer<typeof FinalizeInvoiceOutputSchema>;
