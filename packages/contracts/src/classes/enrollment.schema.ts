import { z } from "zod";
import { ListQuerySchema, createListResponseSchema } from "../common/list.contract";
import { localDateSchema } from "../shared/local-date.schema";
import { ClassEnrollmentSchema } from "./classes.types";

export const UpsertEnrollmentInputSchema = z.object({
  classGroupId: z.string(),
  clientId: z.string(),
  startDate: localDateSchema.optional().nullable(),
  endDate: localDateSchema.optional().nullable(),
  isActive: z.boolean().optional(),
  priceOverridePerSession: z.number().int().nonnegative().optional().nullable(),
  idempotencyKey: z.string().optional(),
});
export type UpsertEnrollmentInput = z.infer<typeof UpsertEnrollmentInputSchema>;

export const UpdateEnrollmentInputSchema = z.object({
  startDate: localDateSchema.optional().nullable(),
  endDate: localDateSchema.optional().nullable(),
  isActive: z.boolean().optional(),
  priceOverridePerSession: z.number().int().nonnegative().optional().nullable(),
});
export type UpdateEnrollmentInput = z.infer<typeof UpdateEnrollmentInputSchema>;

export const ListEnrollmentsInputSchema = ListQuerySchema.extend({
  classGroupId: z.string().optional(),
  clientId: z.string().optional(),
  isActive: z.boolean().optional(),
});
export type ListEnrollmentsInput = z.infer<typeof ListEnrollmentsInputSchema>;

export const ListEnrollmentsOutputSchema = createListResponseSchema(ClassEnrollmentSchema);
export type ListEnrollmentsOutput = z.infer<typeof ListEnrollmentsOutputSchema>;
