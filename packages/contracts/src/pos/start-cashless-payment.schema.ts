import { z } from "zod";

export const CashlessProviderKindSchema = z.enum(["sumup", "adyen"]);
export type CashlessProviderKind = z.infer<typeof CashlessProviderKindSchema>;

export const CashlessAttemptStatusSchema = z.enum([
  "pending",
  "authorized",
  "paid",
  "failed",
  "cancelled",
  "expired",
]);
export type CashlessAttemptStatus = z.infer<typeof CashlessAttemptStatusSchema>;

export const CashlessActionSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("redirect_url"),
    url: z.string().url(),
  }),
  z.object({
    type: z.literal("qr_payload"),
    payload: z.string().min(1),
  }),
  z.object({
    type: z.literal("terminal_action"),
    instruction: z.string().min(1),
  }),
  z.object({
    type: z.literal("none"),
  }),
]);
export type CashlessAction = z.infer<typeof CashlessActionSchema>;

export const StartCashlessPaymentInputSchema = z.object({
  registerId: z.string().uuid(),
  saleId: z.string().uuid().optional(),
  amountCents: z.number().int().positive(),
  currency: z.string().length(3),
  reference: z.string().min(1).max(120).optional(),
  providerHint: CashlessProviderKindSchema.optional(),
  idempotencyKey: z.string().min(1).optional(),
});
export type StartCashlessPaymentInput = z.infer<typeof StartCashlessPaymentInputSchema>;

export const StartCashlessPaymentOutputSchema = z.object({
  attemptId: z.string().uuid(),
  providerKind: CashlessProviderKindSchema,
  providerRef: z.string().min(1),
  status: CashlessAttemptStatusSchema,
  action: CashlessActionSchema,
  expiresAt: z.string().datetime().optional().nullable(),
});
export type StartCashlessPaymentOutput = z.infer<typeof StartCashlessPaymentOutputSchema>;
