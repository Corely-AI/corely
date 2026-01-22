import { z } from "zod";
import { InvoiceDtoSchema } from "./invoice.types";
import { InvoiceCapabilitiesSchema } from "./invoice-capabilities.schema";

export const GetInvoiceByIdInputSchema = z.object({
  invoiceId: z.string(),
});

export const GetInvoiceByIdOutputSchema = z.object({
  invoice: InvoiceDtoSchema,
  capabilities: InvoiceCapabilitiesSchema.optional(),
});

export type GetInvoiceByIdInput = z.infer<typeof GetInvoiceByIdInputSchema>;
export type GetInvoiceByIdOutput = z.infer<typeof GetInvoiceByIdOutputSchema>;
