import { z } from "zod";

export const VatPeriodLineItemSchema = z.object({
  sourceType: z.enum(["INVOICE", "PAYMENT", "EXPENSE"]),
  sourceId: z.string(),
  displayNumber: z.string().optional().nullable(),
  customer: z.string().optional().nullable(),
  dateUsed: z.string().datetime(),
  netAmountCents: z.number().int(),
  taxAmountCents: z.number().int(),
  grossAmountCents: z.number().int(),
  currency: z.string(),
  status: z.string().optional().nullable(),
});

export const GetVatPeriodDetailsOutputSchema = z.object({
  periodKey: z.string(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  currency: z.string(),
  salesNetCents: z.number().int(),
  salesVatCents: z.number().int(),
  salesGrossCents: z.number().int(),
  purchaseNetCents: z.number().int(),
  purchaseVatCents: z.number().int(),
  purchaseGrossCents: z.number().int(),
  taxDueCents: z.number().int(),
  rows: z.array(VatPeriodLineItemSchema),
});

export type VatPeriodLineItem = z.infer<typeof VatPeriodLineItemSchema>;
export type GetVatPeriodDetailsOutput = z.infer<typeof GetVatPeriodDetailsOutputSchema>;
