import { z } from "zod";
import { ListQuerySchema, createListResponseSchema } from "../common/list.contract";
import { utcInstantSchema } from "../shared/local-date.schema";
import {
  ClassDeliveryModeSchema,
  ClassGroupInstructorRoleSchema,
  ClassGroupKindSchema,
  ClassGroupLifecycleSchema,
  ClassGroupSchema,
  ClassGroupStatusSchema,
  ClassGroupInstructorSchema,
} from "./classes.types";

const baseClassGroupInputSchema = z.object({
  name: z.string().min(1),
  subject: z.string().min(1),
  level: z.string().min(1),
  defaultPricePerSession: z.number().int().nonnegative(),
  currency: z.string().min(3).max(3).default("EUR"),
  schedulePattern: z.unknown().optional().nullable(),
  kind: ClassGroupKindSchema.default("COHORT").optional(),
  lifecycle: ClassGroupLifecycleSchema.default("DRAFT").optional(),
  startAt: utcInstantSchema.optional().nullable(),
  endAt: utcInstantSchema.optional().nullable(),
  timezone: z.string().default("Europe/Berlin").optional(),
  capacity: z.number().int().positive().optional().nullable(),
  waitlistEnabled: z.boolean().optional(),
  deliveryMode: ClassDeliveryModeSchema.default("ONLINE").optional(),
  communityUrl: z.string().url().optional().nullable(),
  programId: z.string().optional().nullable(),
});

export const CreateClassGroupInputSchema = baseClassGroupInputSchema.extend({
  idempotencyKey: z.string().optional(),
});
export type CreateClassGroupInput = z.infer<typeof CreateClassGroupInputSchema>;

export const UpdateClassGroupInputSchema = baseClassGroupInputSchema.partial().extend({
  status: ClassGroupStatusSchema.optional(),
});
export type UpdateClassGroupInput = z.infer<typeof UpdateClassGroupInputSchema>;

export const UpdateCohortLifecycleInputSchema = z.object({
  lifecycle: ClassGroupLifecycleSchema,
});
export type UpdateCohortLifecycleInput = z.infer<typeof UpdateCohortLifecycleInputSchema>;

export const CohortTeamMemberInputSchema = z.object({
  partyId: z.string(),
  role: ClassGroupInstructorRoleSchema,
});
export type CohortTeamMemberInput = z.infer<typeof CohortTeamMemberInputSchema>;

export const UpsertCohortTeamInputSchema = z.object({
  members: z.array(CohortTeamMemberInputSchema),
  idempotencyKey: z.string().optional(),
});
export type UpsertCohortTeamInput = z.infer<typeof UpsertCohortTeamInputSchema>;

export const GetCohortTeamOutputSchema = z.object({
  items: z.array(ClassGroupInstructorSchema),
});
export type GetCohortTeamOutput = z.infer<typeof GetCohortTeamOutputSchema>;

export const GetClassGroupOutputSchema = z.object({
  classGroup: ClassGroupSchema,
});
export type GetClassGroupOutput = z.infer<typeof GetClassGroupOutputSchema>;

export const ListClassGroupsInputSchema = ListQuerySchema.extend({
  status: ClassGroupStatusSchema.optional(),
  subject: z.string().optional(),
  level: z.string().optional(),
  kind: ClassGroupKindSchema.optional(),
  lifecycle: ClassGroupLifecycleSchema.optional(),
  startAtFrom: utcInstantSchema.optional(),
  startAtTo: utcInstantSchema.optional(),
});
export type ListClassGroupsInput = z.infer<typeof ListClassGroupsInputSchema>;

export const ListClassGroupsOutputSchema = createListResponseSchema(ClassGroupSchema);
export type ListClassGroupsOutput = z.infer<typeof ListClassGroupsOutputSchema>;
