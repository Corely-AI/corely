import { z } from "zod";
import { utcInstantSchema } from "../shared/local-date.schema";
import { ClassMonthlyBillingRunSchema } from "./classes.types";

export const BillingMonthSchema = z.string().regex(/^\d{4}-\d{2}$/);

export const BillingPreviewLineSchema = z.object({
  classGroupId: z.string(),
  sessions: z.number().int().nonnegative(),
  priceCents: z.number().int().nonnegative(),
  amountCents: z.number().int().nonnegative(),
});
export type BillingPreviewLine = z.infer<typeof BillingPreviewLineSchema>;

export const BillingPreviewItemSchema = z.object({
  clientId: z.string(),
  totalSessions: z.number().int().nonnegative(),
  totalAmountCents: z.number().int().nonnegative(),
  currency: z.string().min(3).max(3),
  lines: z.array(BillingPreviewLineSchema),
});
export type BillingPreviewItem = z.infer<typeof BillingPreviewItemSchema>;

export const BillingPreviewOutputSchema = z.object({
  month: BillingMonthSchema,
  items: z.array(BillingPreviewItemSchema),
  generatedAt: utcInstantSchema,
});
export type BillingPreviewOutput = z.infer<typeof BillingPreviewOutputSchema>;

export const CreateBillingRunInputSchema = z.object({
  month: BillingMonthSchema,
  createInvoices: z.boolean().default(true),
  sendInvoices: z.boolean().default(false),
  idempotencyKey: z.string().optional(),
});
export type CreateBillingRunInput = z.infer<typeof CreateBillingRunInputSchema>;

export const CreateBillingRunOutputSchema = z.object({
  billingRun: ClassMonthlyBillingRunSchema,
  invoiceIds: z.array(z.string()),
});
export type CreateBillingRunOutput = z.infer<typeof CreateBillingRunOutputSchema>;
