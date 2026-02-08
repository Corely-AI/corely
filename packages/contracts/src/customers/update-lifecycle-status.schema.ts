import { z } from "zod";

export const UpdateLifecycleStatusInputSchema = z.object({
  partyId: z.string().cuid(),
  status: z.enum(["LEAD", "ACTIVE", "PAUSED", "ARCHIVED"]),
  reason: z.string().optional(),
});

export type UpdateLifecycleStatusInput = z.infer<typeof UpdateLifecycleStatusInputSchema>;
