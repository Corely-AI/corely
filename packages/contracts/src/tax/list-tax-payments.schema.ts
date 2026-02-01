import { z } from "zod";
import { ListQuerySchema, createListResponseSchema } from "../common/list.contract";
import { TaxFilingTypeSchema } from "./tax-filing.types";

export const TaxPaymentStatusSchema = z.enum(["due", "paid", "overdue"]);
export type TaxPaymentStatus = z.infer<typeof TaxPaymentStatusSchema>;

export const TaxPaymentDirectionSchema = z.enum(["payable", "receivable"]);
export type TaxPaymentDirection = z.infer<typeof TaxPaymentDirectionSchema>;

export const TaxPaymentAmountSchema = z.object({
  value: z.number(),
  currency: z.string(),
  direction: TaxPaymentDirectionSchema,
});
export type TaxPaymentAmount = z.infer<typeof TaxPaymentAmountSchema>;

export const TaxPaymentRowSchema = z.object({
  filingId: z.string(),
  filingType: TaxFilingTypeSchema,
  periodLabel: z.string(),
  dueDate: z.string().datetime(),
  amount: TaxPaymentAmountSchema,
  paymentStatus: TaxPaymentStatusSchema,
  paidAt: z.string().datetime().nullable().optional(),
  method: z.string().nullable().optional(),
  proofDocumentId: z.string().nullable().optional(),
});
export type TaxPaymentRow = z.infer<typeof TaxPaymentRowSchema>;

export const TaxPaymentsListQuerySchema = ListQuerySchema.extend({
  status: TaxPaymentStatusSchema.optional(),
  year: z.coerce.number().int().optional(),
  type: TaxFilingTypeSchema.optional(),
  dueFrom: z.string().datetime().optional(),
  dueTo: z.string().datetime().optional(),
  paidFrom: z.string().datetime().optional(),
  paidTo: z.string().datetime().optional(),
});
export type TaxPaymentsListQuery = z.infer<typeof TaxPaymentsListQuerySchema>;

export const TaxPaymentsListResponseSchema = createListResponseSchema(TaxPaymentRowSchema);
export type TaxPaymentsListResponse = z.infer<typeof TaxPaymentsListResponseSchema>;

export const ListTaxPaymentsInputSchema = TaxPaymentsListQuerySchema;
export type ListTaxPaymentsInput = TaxPaymentsListQuery;

export const ListTaxPaymentsOutputSchema = TaxPaymentsListResponseSchema;
export type ListTaxPaymentsOutput = TaxPaymentsListResponse;
