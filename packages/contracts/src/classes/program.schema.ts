import { z } from "zod";
import { ListQuerySchema, createListResponseSchema } from "../common/list.contract";
import { utcInstantSchema } from "../shared/local-date.schema";
import {
  ClassDeliveryModeSchema,
  ClassGroupKindSchema,
  ClassProgramMilestoneTemplateSchema,
  ClassProgramSchema,
  ClassProgramSessionTemplateSchema,
  ClassSessionTypeSchema,
  MilestoneTypeSchema,
} from "./classes.types";

export const ProgramSessionTemplateInputSchema = z.object({
  index: z.number().int().positive(),
  title: z.string().optional().nullable(),
  defaultDurationMin: z.number().int().positive().optional().nullable(),
  type: ClassSessionTypeSchema.default("LECTURE"),
});

export const ProgramMilestoneTemplateInputSchema = z.object({
  index: z.number().int().positive(),
  title: z.string().min(1),
  type: MilestoneTypeSchema.default("CHECKPOINT"),
  required: z.boolean().default(true),
});

export const CreateProgramInputSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional().nullable(),
  levelTag: z.string().optional().nullable(),
  expectedSessionsCount: z.number().int().positive().optional().nullable(),
  defaultTimezone: z.string().optional().nullable(),
  sessionTemplates: z.array(ProgramSessionTemplateInputSchema).default([]),
  milestoneTemplates: z.array(ProgramMilestoneTemplateInputSchema).default([]),
  idempotencyKey: z.string().optional(),
});
export type CreateProgramInput = z.infer<typeof CreateProgramInputSchema>;

export const UpdateProgramInputSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  levelTag: z.string().optional().nullable(),
  expectedSessionsCount: z.number().int().positive().optional().nullable(),
  defaultTimezone: z.string().optional().nullable(),
  sessionTemplates: z.array(ProgramSessionTemplateInputSchema).optional(),
  milestoneTemplates: z.array(ProgramMilestoneTemplateInputSchema).optional(),
});
export type UpdateProgramInput = z.infer<typeof UpdateProgramInputSchema>;

export const UpsertProgramSessionTemplatesBodySchema = z.object({
  items: z.array(ProgramSessionTemplateInputSchema).default([]),
});
export type UpsertProgramSessionTemplatesBody = z.infer<
  typeof UpsertProgramSessionTemplatesBodySchema
>;

export const UpsertProgramMilestoneTemplatesBodySchema = z.object({
  items: z.array(ProgramMilestoneTemplateInputSchema).default([]),
});
export type UpsertProgramMilestoneTemplatesBody = z.infer<
  typeof UpsertProgramMilestoneTemplatesBodySchema
>;

export const ListProgramsInputSchema = ListQuerySchema.extend({
  levelTag: z.string().optional(),
});
export type ListProgramsInput = z.infer<typeof ListProgramsInputSchema>;

export const ProgramDetailSchema = z.object({
  program: ClassProgramSchema,
  sessionTemplates: z.array(ClassProgramSessionTemplateSchema),
  milestoneTemplates: z.array(ClassProgramMilestoneTemplateSchema),
});
export type ProgramDetail = z.infer<typeof ProgramDetailSchema>;

export const GetProgramOutputSchema = ProgramDetailSchema;
export type GetProgramOutput = z.infer<typeof GetProgramOutputSchema>;

export const ListProgramsOutputSchema = createListResponseSchema(ClassProgramSchema);
export type ListProgramsOutput = z.infer<typeof ListProgramsOutputSchema>;

export const CreateCohortFromProgramInputSchema = z.object({
  cohortName: z.string().min(1),
  subject: z.string().min(1),
  level: z.string().min(1),
  defaultPricePerSession: z.number().int().nonnegative(),
  currency: z.string().min(3).max(3).default("EUR"),
  kind: ClassGroupKindSchema.default("COHORT"),
  timezone: z.string().default("Europe/Berlin"),
  startAt: utcInstantSchema.optional().nullable(),
  endAt: utcInstantSchema.optional().nullable(),
  deliveryMode: ClassDeliveryModeSchema.default("ONLINE"),
  capacity: z.number().int().positive().optional().nullable(),
  waitlistEnabled: z.boolean().optional(),
  communityUrl: z.string().url().optional().nullable(),
  generateSessionsFromTemplates: z.boolean().default(false),
  sessionStartAt: utcInstantSchema.optional(),
  idempotencyKey: z.string().optional(),
});
export type CreateCohortFromProgramInput = z.infer<typeof CreateCohortFromProgramInputSchema>;

export const CreateCohortFromProgramOutputSchema = z.object({
  classGroup: z.object({ id: z.string() }),
  createdSessionCount: z.number().int().nonnegative(),
  createdMilestoneCount: z.number().int().nonnegative(),
});
export type CreateCohortFromProgramOutput = z.infer<typeof CreateCohortFromProgramOutputSchema>;
