import { z } from "zod";
import {
  CashlessActionSchema,
  CashlessAttemptStatusSchema,
  CashlessProviderKindSchema,
} from "./start-cashless-payment.schema";

export const GetCashlessPaymentStatusInputSchema = z.object({
  attemptId: z.string().uuid(),
});
export type GetCashlessPaymentStatusInput = z.infer<typeof GetCashlessPaymentStatusInputSchema>;

export const GetCashlessPaymentStatusOutputSchema = z.object({
  attemptId: z.string().uuid(),
  providerKind: CashlessProviderKindSchema,
  providerRef: z.string().min(1),
  status: CashlessAttemptStatusSchema,
  action: CashlessActionSchema,
  paidAt: z.string().datetime().optional().nullable(),
  failureReason: z.string().optional().nullable(),
  updatedAt: z.string().datetime(),
});
export type GetCashlessPaymentStatusOutput = z.infer<typeof GetCashlessPaymentStatusOutputSchema>;
