import { z } from "zod";

/**
 * Payment method enum
 */
export const PaymentMethod = {
  CASH: "CASH",
  CARD: "CARD",
  BANK_TRANSFER: "BANK_TRANSFER",
  OTHER: "OTHER",
} as const;

export const PaymentMethodSchema = z.enum(["CASH", "CARD", "BANK_TRANSFER", "OTHER"]);

/**
 * POS Sale line item schema
 */
export const PosSaleLineItemSchema = z.object({
  lineItemId: z.string().uuid(),
  productId: z.string().uuid(),
  productName: z.string(),
  sku: z.string(),
  quantity: z.number().int().positive(),
  unitPriceCents: z.number().int().nonnegative(),
  discountCents: z.number().int().nonnegative().default(0),
  lineTotalCents: z.number().int(),
});

export type PosSaleLineItem = z.infer<typeof PosSaleLineItemSchema>;

/**
 * POS Sale payment schema
 */
export const PosSalePaymentSchema = z.object({
  paymentId: z.string().uuid(),
  method: PaymentMethodSchema,
  amountCents: z.number().int().positive(),
  reference: z.string().nullable(),
});

export type PosSalePayment = z.infer<typeof PosSalePaymentSchema>;

/**
 * POS Sale status enum
 */
export const PosSaleStatus = {
  PENDING_SYNC: "PENDING_SYNC",
  SYNCED: "SYNCED",
  FAILED: "FAILED",
} as const;

export const PosSaleStatusSchema = z.enum(["PENDING_SYNC", "SYNCED", "FAILED"]);

/**
 * POS Sale (syncable transaction) schema
 */
export const PosSaleSchema = z.object({
  posSaleId: z.string().uuid(),
  workspaceId: z.string().uuid(),
  sessionId: z.string().uuid().nullable(),
  registerId: z.string().uuid(),
  receiptNumber: z.string(),
  saleDate: z.coerce.date(),
  cashierEmployeePartyId: z.string().uuid(),
  customerPartyId: z.string().uuid().nullable(),
  lineItems: z.array(PosSaleLineItemSchema).min(1),
  cartDiscountCents: z.number().int().nonnegative().default(0),
  subtotalCents: z.number().int(),
  taxCents: z.number().int().nonnegative().default(0),
  totalCents: z.number().int(),
  payments: z.array(PosSalePaymentSchema).min(1),
  status: PosSaleStatusSchema,
  idempotencyKey: z.string(),
  serverInvoiceId: z.string().uuid().nullable(),
  serverPaymentId: z.string().uuid().nullable(),
  syncError: z.string().nullable(),
  syncAttempts: z.number().int().nonnegative().default(0),
  syncedAt: z.coerce.date().nullable(),
  localCreatedAt: z.coerce.date(),
});

export type PosSale = z.infer<typeof PosSaleSchema>;

/**
 * POS Ticket (draft cart) line item schema
 */
export const PosTicketLineItemSchema = z.object({
  lineItemId: z.string().uuid(),
  productId: z.string().uuid(),
  productName: z.string(),
  sku: z.string(),
  quantity: z.number().int().positive(),
  unitPriceCents: z.number().int().nonnegative(),
  discountCents: z.number().int().nonnegative().default(0),
  lineTotalCents: z.number().int(),
});

export type PosTicketLineItem = z.infer<typeof PosTicketLineItemSchema>;

/**
 * POS Ticket status enum
 */
export const PosTicketStatus = {
  DRAFT: "DRAFT",
  FINALIZED: "FINALIZED",
  VOIDED: "VOIDED",
} as const;

export const PosTicketStatusSchema = z.enum(["DRAFT", "FINALIZED", "VOIDED"]);

/**
 * POS Ticket (draft cart) schema
 */
export const PosTicketSchema = z.object({
  ticketId: z.string().uuid(),
  sessionId: z.string().uuid().nullable(),
  customerPartyId: z.string().uuid().nullable(),
  lineItems: z.array(PosTicketLineItemSchema),
  cartDiscountCents: z.number().int().nonnegative().default(0),
  subtotalCents: z.number().int(),
  taxCents: z.number().int().nonnegative().default(0),
  totalCents: z.number().int(),
  status: PosTicketStatusSchema,
  localCreatedAt: z.coerce.date(),
  localUpdatedAt: z.coerce.date(),
});

export type PosTicket = z.infer<typeof PosTicketSchema>;
