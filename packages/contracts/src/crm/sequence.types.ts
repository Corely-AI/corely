import { z } from "zod";
import { utcInstantSchema } from "../shared/local-date.schema";

export const SequenceStepTypeSchema = z.enum([
  "EMAIL_AUTO",
  "EMAIL_MANUAL",
  "CALL",
  "TASK",
]);
export type SequenceStepType = z.infer<typeof SequenceStepTypeSchema>;

export const SequenceStatusSchema = z.enum([
  "ACTIVE",
  "PAUSED",
  "COMPLETED",
  "ARCHIVED",
]);
export type SequenceStatus = z.infer<typeof SequenceStatusSchema>;

export const EnrollmentStatusSchema = z.enum([
  "ACTIVE",
  "PAUSED",
  "COMPLETED",
  "CANCELED",
]);
export type EnrollmentStatus = z.infer<typeof EnrollmentStatusSchema>;

export const SequenceStepDtoSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  sequenceId: z.string(),
  stepOrder: z.number().int().positive(),
  type: SequenceStepTypeSchema,
  dayDelay: z.number().int().nonnegative(),
  templateSubject: z.string().nullable(),
  templateBody: z.string().nullable(),
});
export type SequenceStepDto = z.infer<typeof SequenceStepDtoSchema>;

export const SequenceDtoSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  name: z.string(),
  ownerUserId: z.string().nullable(),
  description: z.string().nullable().optional(),
  createdAt: utcInstantSchema,
  updatedAt: utcInstantSchema,
  steps: z.array(SequenceStepDtoSchema).optional(),
});
export type SequenceDto = z.infer<typeof SequenceDtoSchema>;

export const SequenceEnrollmentDtoSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  sequenceId: z.string(),
  leadId: z.string().nullable(),
  partyId: z.string().nullable(),
  currentStepOrder: z.number().int(),
  status: EnrollmentStatusSchema,
  nextExecutionAt: utcInstantSchema.nullable(),
  createdAt: utcInstantSchema,
  updatedAt: utcInstantSchema,
});
export type SequenceEnrollmentDto = z.infer<typeof SequenceEnrollmentDtoSchema>;

export const CreateSequenceInputSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  steps: z.array(
    z.object({
      stepOrder: z.number().int().positive(),
      type: SequenceStepTypeSchema,
      dayDelay: z.number().int().nonnegative(),
      templateSubject: z.string().optional(),
      templateBody: z.string().optional(),
    })
  ).min(1),
});
export type CreateSequenceInput = z.infer<typeof CreateSequenceInputSchema>;

export const EnrollEntityInputSchema = z.object({
  sequenceId: z.string(),
  entityType: z.enum(["lead", "party"]),
  entityId: z.string(),
});
export type EnrollEntityInput = z.infer<typeof EnrollEntityInputSchema>;

export const RunSequenceStepsInputSchema = z.object({
  limit: z.number().int().positive().default(50),
});
export type RunSequenceStepsInput = z.infer<typeof RunSequenceStepsInputSchema>;

export const RunSequenceStepsOutputSchema = z.object({
  processed: z.number().int().nonnegative(),
});
export type RunSequenceStepsOutput = z.infer<typeof RunSequenceStepsOutputSchema>;
