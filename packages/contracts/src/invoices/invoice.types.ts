import { z } from "zod";

export const InvoiceStatusSchema = z.enum(["DRAFT", "ISSUED", "SENT", "PAID", "CANCELED"]);
export type InvoiceStatus = z.infer<typeof InvoiceStatusSchema>;

export const InvoiceLineSchema = z.object({
  id: z.string(),
  description: z.string(),
  qty: z.number().positive(),
  unitPriceCents: z.number().int().nonnegative(),
});
export type InvoiceLineDto = z.infer<typeof InvoiceLineSchema>;

export const InvoicePaymentSchema = z.object({
  id: z.string(),
  amountCents: z.number().int().positive(),
  paidAt: z.string(),
  note: z.string().optional(),
});
export type InvoicePaymentDto = z.infer<typeof InvoicePaymentSchema>;

export const InvoiceTotalsSchema = z.object({
  subtotalCents: z.number().int(),
  taxCents: z.number().int(),
  discountCents: z.number().int(),
  totalCents: z.number().int(),
  paidCents: z.number().int(),
  dueCents: z.number().int(),
});
export type InvoiceTotalsDto = z.infer<typeof InvoiceTotalsSchema>;

export const InvoiceDtoSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  number: z.string().nullable(),
  status: InvoiceStatusSchema,
  customerId: z.string(),
  currency: z.string(),
  notes: z.string().optional().nullable(),
  terms: z.string().optional().nullable(),
  issuedAt: z.string().nullable(),
  sentAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  lineItems: z.array(InvoiceLineSchema),
  payments: z.array(InvoicePaymentSchema).optional(),
  totals: InvoiceTotalsSchema,
});
export type InvoiceDto = z.infer<typeof InvoiceDtoSchema>;
