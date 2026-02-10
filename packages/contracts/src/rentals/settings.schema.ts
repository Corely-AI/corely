import { z } from "zod";
import { RentalHostContactMethodSchema } from "./rentals.types";

export const RentalContactSettingsSchema = z.object({
  hostContactMethod: RentalHostContactMethodSchema.nullable().default(null),
  hostContactEmail: z.string().nullable().default(null),
  hostContactPhone: z.string().nullable().default(null),
});
export type RentalContactSettings = z.infer<typeof RentalContactSettingsSchema>;

export const GetRentalContactSettingsOutputSchema = z.object({
  settings: RentalContactSettingsSchema,
});
export type GetRentalContactSettingsOutput = z.infer<typeof GetRentalContactSettingsOutputSchema>;

export const UpdateRentalContactSettingsInputSchema = z.object({
  hostContactMethod: RentalHostContactMethodSchema.nullable().optional(),
  hostContactEmail: z.string().email().nullable().optional(),
  hostContactPhone: z.string().nullable().optional(),
});
export type UpdateRentalContactSettingsInput = z.infer<
  typeof UpdateRentalContactSettingsInputSchema
>;

export const UpdateRentalContactSettingsOutputSchema = z.object({
  settings: RentalContactSettingsSchema,
});
export type UpdateRentalContactSettingsOutput = z.infer<
  typeof UpdateRentalContactSettingsOutputSchema
>;
