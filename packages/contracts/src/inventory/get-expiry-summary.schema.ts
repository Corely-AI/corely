import { z } from "zod";
import { localDateSchema } from "../shared/local-date.schema";

export const GetExpirySummaryInputSchema = z.object({
  days: z.number().int().positive().optional().default(30), // Days in advance to check
});

export const ExpiryItemSchema = z.object({
  lotId: z.string(),
  lotNumber: z.string(),
  productId: z.string(),
  productName: z.string().optional(), // Denormalized for display
  expiryDate: localDateSchema.nullable(),
  qtyOnHand: z.number().nonnegative(),
  daysUntilExpiry: z.number().int(), // Negative if already expired
});

export const GetExpirySummaryOutputSchema = z.object({
  expiringSoon: z.array(ExpiryItemSchema),
  expired: z.array(ExpiryItemSchema),
  totalExpiringSoon: z.number().int().nonnegative(),
  totalExpired: z.number().int().nonnegative(),
});

export type GetExpirySummaryInput = z.infer<typeof GetExpirySummaryInputSchema>;
export type GetExpirySummaryOutput = z.infer<typeof GetExpirySummaryOutputSchema>;
export type ExpiryItem = z.infer<typeof ExpiryItemSchema>;
