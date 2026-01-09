import { z } from "zod";
import { ShiftSessionSchema } from "./shift-session.types";

/**
 * Get Current Shift input schema
 */
export const GetCurrentShiftInputSchema = z.object({
  registerId: z.string().uuid(),
});

export type GetCurrentShiftInput = z.infer<typeof GetCurrentShiftInputSchema>;

/**
 * Get Current Shift output schema
 */
export const GetCurrentShiftOutputSchema = z.object({
  session: ShiftSessionSchema.nullable(),
});

export type GetCurrentShiftOutput = z.infer<typeof GetCurrentShiftOutputSchema>;
