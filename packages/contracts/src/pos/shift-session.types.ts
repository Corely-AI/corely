import { z } from "zod";

/**
 * Shift session (register operating session) schema
 */
export const ShiftSessionSchema = z.object({
  sessionId: z.string().uuid(),
  registerId: z.string().uuid(),
  workspaceId: z.string().uuid(),
  openedByEmployeePartyId: z.string().uuid(),
  openedAt: z.coerce.date(),
  startingCashCents: z.number().int().nullable(),
  status: z.enum(["OPEN", "CLOSED"]),
  closedAt: z.coerce.date().nullable(),
  closedByEmployeePartyId: z.string().uuid().nullable(),
  closingCashCents: z.number().int().nullable(),
  totalSalesCents: z.number().int().default(0),
  totalCashReceivedCents: z.number().int().default(0),
  varianceCents: z.number().int().nullable(),
  notes: z.string().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type ShiftSession = z.infer<typeof ShiftSessionSchema>;

/**
 * Shift session status enum
 */
export const ShiftSessionStatus = {
  OPEN: "OPEN",
  CLOSED: "CLOSED",
} as const;
