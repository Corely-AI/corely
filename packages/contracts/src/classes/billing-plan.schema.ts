import { z } from "zod";
import {
  BillingInvoicePurposeSchema,
  BillingPlanTypeSchema,
  ClassBillingInvoiceLinkSchema,
  ClassEnrollmentBillingPlanSchema,
} from "./classes.types";

export const UpfrontBillingScheduleSchema = z.object({
  amountCents: z.number().int().positive(),
  currency: z.string().min(3).max(3),
  dueDate: z.string().optional(),
  label: z.string().optional(),
});

export const InstallmentEntrySchema = z.object({
  dueDate: z.string(),
  amountCents: z.number().int().positive(),
  label: z.string().optional(),
});

export const InstallmentsBillingScheduleSchema = z.object({
  currency: z.string().min(3).max(3),
  installments: z.array(InstallmentEntrySchema).min(1),
  terms: z.string().optional(),
});

export const InvoiceNetBillingScheduleSchema = z.object({
  amountCents: z.number().int().positive(),
  currency: z.string().min(3).max(3),
  netDays: z.number().int().positive(),
  purchaseOrderNumber: z.string().optional(),
});

export const BillingPlanScheduleSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("UPFRONT"), data: UpfrontBillingScheduleSchema }),
  z.object({ type: z.literal("INSTALLMENTS"), data: InstallmentsBillingScheduleSchema }),
  z.object({ type: z.literal("INVOICE_NET"), data: InvoiceNetBillingScheduleSchema }),
  z.object({ type: z.literal("SUBSCRIPTION"), data: z.record(z.string(), z.unknown()) }),
]);
export type BillingPlanSchedule = z.infer<typeof BillingPlanScheduleSchema>;

export const UpsertEnrollmentBillingPlanInputSchema = z.object({
  type: BillingPlanTypeSchema,
  scheduleJson: BillingPlanScheduleSchema,
  idempotencyKey: z.string().optional(),
});
export type UpsertEnrollmentBillingPlanInput = z.infer<
  typeof UpsertEnrollmentBillingPlanInputSchema
>;

export const GetEnrollmentBillingPlanOutputSchema = z.object({
  billingPlan: ClassEnrollmentBillingPlanSchema.nullable(),
});
export type GetEnrollmentBillingPlanOutput = z.infer<typeof GetEnrollmentBillingPlanOutputSchema>;

export const GenerateBillingPlanInvoicesInputSchema = z.object({
  sendInvoices: z.boolean().default(false),
  purpose: BillingInvoicePurposeSchema.optional(),
  idempotencyKey: z.string().optional(),
});
export type GenerateBillingPlanInvoicesInput = z.infer<
  typeof GenerateBillingPlanInvoicesInputSchema
>;

export const GenerateBillingPlanInvoicesOutputSchema = z.object({
  invoiceIds: z.array(z.string()),
  links: z.array(ClassBillingInvoiceLinkSchema),
});
export type GenerateBillingPlanInvoicesOutput = z.infer<
  typeof GenerateBillingPlanInvoicesOutputSchema
>;
