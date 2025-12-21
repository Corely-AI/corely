import { z } from "zod";
import { InvoiceDtoSchema } from "./invoice.types";

export const SendInvoiceInputSchema = z.object({
  invoiceId: z.string(),
  channel: z.enum(["email", "link"]).default("email"),
  emailTo: z.string().email().optional(),
});

export const SendInvoiceOutputSchema = z.object({
  invoice: InvoiceDtoSchema,
});

export type SendInvoiceInput = z.infer<typeof SendInvoiceInputSchema>;
export type SendInvoiceOutput = z.infer<typeof SendInvoiceOutputSchema>;
