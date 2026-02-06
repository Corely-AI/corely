import { z } from "zod";
import { utcInstantSchema } from "../shared/local-date.schema";
import {
  ClassBillingBasisSchema,
  ClassBillingMonthStrategySchema,
  ClassBillingRunStatusSchema,
  ClassMonthlyBillingRunSchema,
} from "./classes.types";

export const BillingMonthSchema = z.string().regex(/^\d{4}-\d{2}$/);

export const BillingPreviewLineSchema = z.object({
  classGroupId: z.string(),
  sessions: z.number().int().nonnegative(),
  priceCents: z.number().int().nonnegative(),
  amountCents: z.number().int().nonnegative(),
});
export type BillingPreviewLine = z.infer<typeof BillingPreviewLineSchema>;

export const BillingPreviewItemSchema = z.object({
  payerClientId: z.string(),
  totalSessions: z.number().int().nonnegative(),
  totalAmountCents: z.number().int().nonnegative(),
  currency: z.string().min(3).max(3),
  lines: z.array(BillingPreviewLineSchema),
});
export type BillingPreviewItem = z.infer<typeof BillingPreviewItemSchema>;

export const BillingPreviewInvoiceLinkSchema = z.object({
  payerClientId: z.string(),
  invoiceId: z.string(),
});
export type BillingPreviewInvoiceLink = z.infer<typeof BillingPreviewInvoiceLinkSchema>;

export const BillingPreviewOutputSchema = z.object({
  month: BillingMonthSchema,
  billingMonthStrategy: ClassBillingMonthStrategySchema,
  billingBasis: ClassBillingBasisSchema,
  billingRunStatus: ClassBillingRunStatusSchema.optional().nullable(),
  items: z.array(BillingPreviewItemSchema),
  invoiceLinks: z.array(BillingPreviewInvoiceLinkSchema).optional(),
  invoicesSentAt: utcInstantSchema.optional().nullable(),
  generatedAt: utcInstantSchema,
});
export type BillingPreviewOutput = z.infer<typeof BillingPreviewOutputSchema>;

export const CreateBillingRunInputSchema = z.object({
  month: BillingMonthSchema,
  createInvoices: z.boolean().default(true),
  sendInvoices: z.boolean().default(false),
  idempotencyKey: z.string().optional(),
  force: z.boolean().optional(),
});
export type CreateBillingRunInput = z.infer<typeof CreateBillingRunInputSchema>;

export const CreateBillingRunOutputSchema = z.object({
  billingRun: ClassMonthlyBillingRunSchema,
  invoiceIds: z.array(z.string()),
});
export type CreateBillingRunOutput = z.infer<typeof CreateBillingRunOutputSchema>;
