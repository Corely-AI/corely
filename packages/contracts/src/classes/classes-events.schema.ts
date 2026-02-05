import { z } from "zod";
import { BillingMonthSchema } from "./billing.schema";

export const ClassesMonthlyInvoicesGeneratedEventSchema = z.object({
  tenantId: z.string(),
  month: BillingMonthSchema,
  billingRunId: z.string(),
  invoiceIds: z.array(z.string()),
});
export type ClassesMonthlyInvoicesGeneratedEvent = z.infer<
  typeof ClassesMonthlyInvoicesGeneratedEventSchema
>;

export const ClassesInvoiceReadyToSendEventSchema = z.object({
  tenantId: z.string(),
  invoiceId: z.string(),
});
export type ClassesInvoiceReadyToSendEvent = z.infer<typeof ClassesInvoiceReadyToSendEventSchema>;
