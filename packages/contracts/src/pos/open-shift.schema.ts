import { z } from "zod";

/**
 * Open Shift input schema
 */
export const OpenShiftInputSchema = z.object({
  sessionId: z.string().uuid(),
  registerId: z.string().uuid(),
  openedByEmployeePartyId: z.string().uuid(),
  startingCashCents: z.number().int().nonnegative().nullable(),
  notes: z.string().max(500).optional(),
});

export type OpenShiftInput = z.infer<typeof OpenShiftInputSchema>;

/**
 * Open Shift output schema
 */
export const OpenShiftOutputSchema = z.object({
  sessionId: z.string().uuid(),
  status: z.literal("OPEN"),
  openedAt: z.coerce.date(),
});

export type OpenShiftOutput = z.infer<typeof OpenShiftOutputSchema>;
