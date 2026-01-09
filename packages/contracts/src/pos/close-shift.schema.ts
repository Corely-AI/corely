import { z } from "zod";

/**
 * Close Shift input schema
 */
export const CloseShiftInputSchema = z.object({
  sessionId: z.string().uuid(),
  closingCashCents: z.number().int().nonnegative().nullable(),
  notes: z.string().max(500).optional(),
});

export type CloseShiftInput = z.infer<typeof CloseShiftInputSchema>;

/**
 * Close Shift output schema
 */
export const CloseShiftOutputSchema = z.object({
  sessionId: z.string().uuid(),
  status: z.literal("CLOSED"),
  closedAt: z.coerce.date(),
  totalSalesCents: z.number().int(),
  totalCashReceivedCents: z.number().int(),
  varianceCents: z.number().int().nullable(),
});

export type CloseShiftOutput = z.infer<typeof CloseShiftOutputSchema>;
