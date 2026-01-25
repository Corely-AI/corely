import { z } from "zod";
import { InvoiceDtoSchema } from "./invoice.types";
import { localDateSchema } from "../shared/local-date.schema";

export const InvoiceLineInputSchema = z.object({
  description: z.string(),
  qty: z.number().positive(),
  unitPriceCents: z.number().int().nonnegative(),
});

export const CreateInvoiceInputSchema = z.object({
  customerPartyId: z.string(),
  customerContactPartyId: z.string().optional(),
  currency: z.string(),
  notes: z.string().optional(),
  terms: z.string().optional(),
  invoiceDate: localDateSchema.optional(),
  dueDate: localDateSchema.optional(),
  lineItems: z.array(InvoiceLineInputSchema).min(1),
  legalEntityId: z.string().optional(),
  paymentMethodId: z.string().optional(),
  // Source tracking for invoices created from sales artifacts
  sourceType: z.enum(["order", "quote", "deal", "manual"]).optional(),
  sourceId: z.string().optional(),
  idempotencyKey: z.string().optional(),
});

export const CreateInvoiceOutputSchema = z.object({
  invoice: InvoiceDtoSchema,
});

export type CreateInvoiceInput = z.infer<typeof CreateInvoiceInputSchema>;
export type CreateInvoiceOutput = z.infer<typeof CreateInvoiceOutputSchema>;
