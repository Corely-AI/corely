import { z } from "zod";
import { RentalAvailabilityRangeSchema } from "./rentals.types";

export const CheckAvailabilityInputSchema = z.object({
  propertySlug: z.string(),
  from: z.string(), // YYYY-MM-DD
  to: z.string(), // YYYY-MM-DD
});
export type CheckAvailabilityInput = z.infer<typeof CheckAvailabilityInputSchema>;

export const CheckAvailabilityOutputSchema = z.object({
  isAvailable: z.boolean(),
  blockedRanges: z.array(RentalAvailabilityRangeSchema),
});
export type CheckAvailabilityOutput = z.infer<typeof CheckAvailabilityOutputSchema>;
