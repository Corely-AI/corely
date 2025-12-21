import { z } from "zod";
import { InvoiceDtoSchema } from "./invoice.types";

export const GetInvoiceByIdInputSchema = z.object({
  invoiceId: z.string(),
});

export const GetInvoiceByIdOutputSchema = z.object({
  invoice: InvoiceDtoSchema,
});

export type GetInvoiceByIdInput = z.infer<typeof GetInvoiceByIdInputSchema>;
export type GetInvoiceByIdOutput = z.infer<typeof GetInvoiceByIdOutputSchema>;
