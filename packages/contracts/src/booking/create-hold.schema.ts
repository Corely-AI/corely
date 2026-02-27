import { z } from "zod";
import { BookingHoldDtoSchema } from "./booking.types";

export const CreateHoldInputSchema = z.object({
  startAt: z.string().datetime(),
  endAt: z.string().datetime(),
  serviceOfferingId: z.string().optional().nullable(),
  /** Explicit resource IDs to hold. Required when no serviceOfferingId is given. */
  resourceIds: z.array(z.string()).min(1),
  bookedByPartyId: z.string().optional().nullable(),
  bookedByName: z.string().optional().nullable(),
  bookedByEmail: z.string().email().optional().nullable(),
  notes: z.string().optional().nullable(),
  /** TTL in seconds; defaults to 600 (10 minutes) */
  ttlSeconds: z.number().int().positive().default(600),
  idempotencyKey: z.string().optional(),
});
export type CreateHoldInput = z.infer<typeof CreateHoldInputSchema>;

export const CreateHoldOutputSchema = z.object({ hold: BookingHoldDtoSchema });
export type CreateHoldOutput = z.infer<typeof CreateHoldOutputSchema>;
