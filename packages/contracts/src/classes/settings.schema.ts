import { z } from "zod";
import { ClassBillingBasisSchema, ClassBillingMonthStrategySchema } from "./classes.types";

export const AttendanceModeSchema = z.enum(["MANUAL", "AUTO_FULL"]);
export type AttendanceMode = z.infer<typeof AttendanceModeSchema>;

export const ClassesBillingSettingsSchema = z.object({
  billingMonthStrategy: ClassBillingMonthStrategySchema,
  billingBasis: ClassBillingBasisSchema,
  attendanceMode: AttendanceModeSchema.default("MANUAL"),
});
export type ClassesBillingSettings = z.infer<typeof ClassesBillingSettingsSchema>;

export const GetClassesBillingSettingsOutputSchema = z.object({
  settings: ClassesBillingSettingsSchema,
});
export type GetClassesBillingSettingsOutput = z.infer<typeof GetClassesBillingSettingsOutputSchema>;

export const UpdateClassesBillingSettingsInputSchema = z.object({
  billingMonthStrategy: ClassBillingMonthStrategySchema.optional(),
  billingBasis: ClassBillingBasisSchema.optional(),
  attendanceMode: AttendanceModeSchema.optional(),
});
export type UpdateClassesBillingSettingsInput = z.infer<
  typeof UpdateClassesBillingSettingsInputSchema
>;

export const UpdateClassesBillingSettingsOutputSchema = z.object({
  settings: ClassesBillingSettingsSchema,
});
export type UpdateClassesBillingSettingsOutput = z.infer<
  typeof UpdateClassesBillingSettingsOutputSchema
>;
