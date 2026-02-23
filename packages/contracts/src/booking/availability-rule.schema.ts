import { z } from "zod";
import {
  AvailabilityRuleDtoSchema,
  WeeklyScheduleSlotSchema,
  BlackoutIntervalSchema,
} from "./booking.types";

export const UpsertAvailabilityRuleInputSchema = z.object({
  timezone: z.string().default("UTC"),
  weeklySlots: z.array(WeeklyScheduleSlotSchema),
  blackouts: z.array(BlackoutIntervalSchema).default([]),
  effectiveFrom: z.string().datetime().optional().nullable(),
  effectiveTo: z.string().datetime().optional().nullable(),
});
export type UpsertAvailabilityRuleInput = z.infer<typeof UpsertAvailabilityRuleInputSchema>;

export const UpsertAvailabilityRuleOutputSchema = z.object({
  rule: AvailabilityRuleDtoSchema,
});
export type UpsertAvailabilityRuleOutput = z.infer<typeof UpsertAvailabilityRuleOutputSchema>;

export const GetAvailabilityInputSchema = z.object({
  resourceId: z.string(),
  from: z.string().datetime(),
  to: z.string().datetime(),
});
export type GetAvailabilityInput = z.infer<typeof GetAvailabilityInputSchema>;

export const AvailableSlotSchema = z.object({
  startAt: z.string(),
  endAt: z.string(),
  resourceId: z.string(),
  isAvailable: z.boolean(),
});
export type AvailableSlot = z.infer<typeof AvailableSlotSchema>;

export const GetAvailabilityOutputSchema = z.object({
  slots: z.array(AvailableSlotSchema),
  rule: AvailabilityRuleDtoSchema.nullable(),
});
export type GetAvailabilityOutput = z.infer<typeof GetAvailabilityOutputSchema>;
