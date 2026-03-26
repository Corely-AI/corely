import { z } from "zod";
import { PosSaleLineItemSchema, PosSalePaymentSchema, PosSaleStatusSchema } from "./pos-sale.types";

export const PosTransactionSummarySchema = z.object({
  transactionId: z.string().uuid(),
  workspaceId: z.string().uuid(),
  sessionId: z.string().uuid().nullable(),
  registerId: z.string().uuid(),
  registerName: z.string().nullable().optional(),
  receiptNumber: z.string(),
  saleDate: z.coerce.date(),
  cashierEmployeePartyId: z.string().uuid(),
  customerPartyId: z.string().uuid().nullable(),
  subtotalCents: z.number().int(),
  taxCents: z.number().int().nonnegative(),
  totalCents: z.number().int(),
  currency: z.string().length(3),
  status: PosSaleStatusSchema,
  payments: z.array(PosSalePaymentSchema),
  syncedAt: z.coerce.date(),
  createdAt: z.coerce.date(),
});

export type PosTransactionSummary = z.infer<typeof PosTransactionSummarySchema>;

export const PosTransactionDetailSchema = PosTransactionSummarySchema.extend({
  idempotencyKey: z.string(),
  serverInvoiceId: z.string().uuid().nullable(),
  serverPaymentId: z.string().uuid().nullable(),
  lineItems: z.array(PosSaleLineItemSchema),
  updatedAt: z.coerce.date(),
});

export type PosTransactionDetail = z.infer<typeof PosTransactionDetailSchema>;
