import { z } from "zod";
import { PosSaleLineItemSchema, PosSalePaymentSchema } from "./pos-sale.types";

/**
 * Sync POS Sale input schema
 */
export const SyncPosSaleInputSchema = z.object({
  posSaleId: z.string().uuid(),
  workspaceId: z.string().uuid(),
  sessionId: z.string().uuid().nullable(),
  registerId: z.string().uuid(),
  saleDate: z.coerce.date(),
  cashierEmployeePartyId: z.string().uuid(),
  customerPartyId: z.string().uuid().nullable(),
  lineItems: z.array(PosSaleLineItemSchema).min(1),
  cartDiscountCents: z.number().int().nonnegative().default(0),
  subtotalCents: z.number().int(),
  taxCents: z.number().int().nonnegative().default(0),
  totalCents: z.number().int(),
  payments: z.array(PosSalePaymentSchema).min(1),
  idempotencyKey: z.string(),
});

export type SyncPosSaleInput = z.infer<typeof SyncPosSaleInputSchema>;

/**
 * Sync POS Sale output schema (success)
 */
export const SyncPosSaleOutputSchema = z.object({
  ok: z.boolean(),
  serverInvoiceId: z.string().uuid().optional(),
  serverPaymentId: z.string().uuid().optional(),
  receiptNumber: z.string().optional(),
  code: z.string().optional(), // Error code if ok=false
  message: z.string().optional(),
  details: z.unknown().optional(),
});

export type SyncPosSaleOutput = z.infer<typeof SyncPosSaleOutputSchema>;
