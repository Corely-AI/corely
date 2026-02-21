import { z } from "zod";
import { ListQuerySchema, createListResponseSchema } from "../common/list.contract";
import { localDateSchema, utcInstantSchema } from "../shared/local-date.schema";
import { BillingMonthSchema } from "./billing.schema";
import {
  ClassSessionSchema,
  ClassSessionStatusSchema,
  ClassSessionTypeSchema,
  MeetingProviderSchema,
} from "./classes.types";

const sessionFields = z.object({
  classGroupId: z.string(),
  startsAt: utcInstantSchema,
  endsAt: utcInstantSchema.optional().nullable(),
  topic: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  status: ClassSessionStatusSchema.optional(),
  type: ClassSessionTypeSchema.optional(),
  meetingProvider: MeetingProviderSchema.optional().nullable(),
  meetingJoinUrl: z.string().url().optional().nullable(),
  meetingExternalId: z.string().optional().nullable(),
});

export const CreateClassSessionInputSchema = sessionFields.extend({
  idempotencyKey: z.string().optional(),
});
export type CreateClassSessionInput = z.infer<typeof CreateClassSessionInputSchema>;

export const UpdateClassSessionInputSchema = sessionFields.partial().omit({ classGroupId: true });
export type UpdateClassSessionInput = z.infer<typeof UpdateClassSessionInputSchema>;

export const CreateRecurringSessionsInputSchema = z.object({
  classGroupId: z.string(),
  startDate: localDateSchema,
  endDate: localDateSchema,
  weekdays: z.array(z.number().int().min(0).max(6)).min(1),
  time: z.string().regex(/^\d{2}:\d{2}$/),
  durationMinutes: z.number().int().positive(),
  timezone: z.string().default("Europe/Berlin"),
  idempotencyKey: z.string().optional(),
});
export type CreateRecurringSessionsInput = z.infer<typeof CreateRecurringSessionsInputSchema>;

export const GetClassSessionOutputSchema = z.object({
  session: ClassSessionSchema,
});
export type GetClassSessionOutput = z.infer<typeof GetClassSessionOutputSchema>;

export const CreateRecurringSessionsOutputSchema = z.object({
  items: z.array(ClassSessionSchema),
});
export type CreateRecurringSessionsOutput = z.infer<typeof CreateRecurringSessionsOutputSchema>;

export const GenerateClassGroupSessionsInputSchema = z.object({
  month: BillingMonthSchema.optional(),
});
export type GenerateClassGroupSessionsInput = z.infer<typeof GenerateClassGroupSessionsInputSchema>;

export const GenerateClassGroupSessionsOutputSchema = CreateRecurringSessionsOutputSchema;
export type GenerateClassGroupSessionsOutput = z.infer<
  typeof GenerateClassGroupSessionsOutputSchema
>;

export const ListClassSessionsInputSchema = ListQuerySchema.extend({
  classGroupId: z.string().optional(),
  status: ClassSessionStatusSchema.optional(),
  dateFrom: localDateSchema.optional(),
  dateTo: localDateSchema.optional(),
  type: ClassSessionTypeSchema.optional(),
});
export type ListClassSessionsInput = z.infer<typeof ListClassSessionsInputSchema>;

export const ListClassSessionsOutputSchema = createListResponseSchema(ClassSessionSchema);
export type ListClassSessionsOutput = z.infer<typeof ListClassSessionsOutputSchema>;
