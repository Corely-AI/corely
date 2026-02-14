import { z } from "zod";
import { utcInstantSchema } from "../shared/local-date.schema";
import { InvoiceStatusSchema } from "../invoices/invoice.types";
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
  invoiceStatus: InvoiceStatusSchema.optional().nullable(),
});
export type BillingPreviewInvoiceLink = z.infer<typeof BillingPreviewInvoiceLinkSchema>;

export const BillingInvoiceSendProgressSchema = z.object({
  expectedInvoiceCount: z.number().int().nonnegative(),
  processedInvoiceCount: z.number().int().nonnegative(),
  pendingCount: z.number().int().nonnegative(),
  queuedCount: z.number().int().nonnegative(),
  sentCount: z.number().int().nonnegative(),
  deliveredCount: z.number().int().nonnegative(),
  delayedCount: z.number().int().nonnegative(),
  failedCount: z.number().int().nonnegative(),
  bouncedCount: z.number().int().nonnegative(),
  isComplete: z.boolean(),
  hasFailures: z.boolean(),
});
export type BillingInvoiceSendProgress = z.infer<typeof BillingInvoiceSendProgressSchema>;

export const BillingInvoiceSendProgressEventSchema = z.object({
  billingRunId: z.string(),
  month: BillingMonthSchema,
  progress: BillingInvoiceSendProgressSchema.nullable(),
  isComplete: z.boolean(),
  generatedAt: utcInstantSchema,
});
export type BillingInvoiceSendProgressEvent = z.infer<typeof BillingInvoiceSendProgressEventSchema>;

export const BillingPreviewOutputSchema = z.object({
  month: BillingMonthSchema,
  billingMonthStrategy: ClassBillingMonthStrategySchema,
  billingBasis: ClassBillingBasisSchema,
  billingRunStatus: ClassBillingRunStatusSchema.optional().nullable(),
  items: z.array(BillingPreviewItemSchema),
  invoiceLinks: z.array(BillingPreviewInvoiceLinkSchema).optional(),
  invoicesSentAt: utcInstantSchema.optional().nullable(),
  invoiceSendProgress: BillingInvoiceSendProgressSchema.optional().nullable(),
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
