import { z } from "zod";
import { utcInstantSchema } from "../shared/local-date.schema";
import {
  ClassMilestoneCompletionSchema,
  ClassMilestoneSchema,
  MilestoneCompletionStatusSchema,
  MilestoneTypeSchema,
} from "./classes.types";

export const CreateMilestoneInputSchema = z.object({
  title: z.string().min(1),
  type: MilestoneTypeSchema.default("CHECKPOINT"),
  dueAt: utcInstantSchema.optional().nullable(),
  required: z.boolean().default(true),
  index: z.number().int().positive().optional().nullable(),
  programMilestoneTemplateId: z.string().optional().nullable(),
  idempotencyKey: z.string().optional(),
});
export type CreateMilestoneInput = z.infer<typeof CreateMilestoneInputSchema>;

export const UpdateMilestoneInputSchema = z.object({
  title: z.string().min(1).optional(),
  type: MilestoneTypeSchema.optional(),
  dueAt: utcInstantSchema.optional().nullable(),
  required: z.boolean().optional(),
  index: z.number().int().positive().optional().nullable(),
});
export type UpdateMilestoneInput = z.infer<typeof UpdateMilestoneInputSchema>;

export const UpsertMilestoneCompletionInputSchema = z.object({
  status: MilestoneCompletionStatusSchema,
  score: z.number().int().optional().nullable(),
  feedback: z.string().optional().nullable(),
  gradedByPartyId: z.string().optional().nullable(),
  gradedAt: utcInstantSchema.optional().nullable(),
  idempotencyKey: z.string().optional(),
});
export type UpsertMilestoneCompletionInput = z.infer<typeof UpsertMilestoneCompletionInputSchema>;

export const ListMilestonesOutputSchema = z.object({
  items: z.array(ClassMilestoneSchema),
});
export type ListMilestonesOutput = z.infer<typeof ListMilestonesOutputSchema>;

export const MilestoneCompletionMatrixItemSchema = z.object({
  enrollmentId: z.string(),
  milestoneId: z.string(),
  completion: ClassMilestoneCompletionSchema.nullable(),
});

export const OutcomesSummarySchema = z.object({
  classGroupId: z.string(),
  totalRequiredMilestones: z.number().int().nonnegative(),
  totalCompletionsPassed: z.number().int().nonnegative(),
  atRiskLearnersCount: z.number().int().nonnegative(),
  completionRate: z.number().min(0).max(1),
});
export type OutcomesSummary = z.infer<typeof OutcomesSummarySchema>;

export const GetOutcomesSummaryOutputSchema = z.object({
  summary: OutcomesSummarySchema,
});
export type GetOutcomesSummaryOutput = z.infer<typeof GetOutcomesSummaryOutputSchema>;
