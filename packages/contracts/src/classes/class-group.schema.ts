import { z } from "zod";
import { ListQuerySchema, createListResponseSchema } from "../common/list.contract";
import { ClassGroupSchema, ClassGroupStatusSchema } from "./classes.types";

export const CreateClassGroupInputSchema = z.object({
  name: z.string().min(1),
  subject: z.string().min(1),
  level: z.string().min(1),
  defaultPricePerSession: z.number().int().nonnegative(),
  currency: z.string().min(3).max(3).default("EUR"),
  schedulePattern: z.unknown().optional().nullable(),
  idempotencyKey: z.string().optional(),
});
export type CreateClassGroupInput = z.infer<typeof CreateClassGroupInputSchema>;

export const UpdateClassGroupInputSchema = z.object({
  name: z.string().min(1).optional(),
  subject: z.string().min(1).optional(),
  level: z.string().min(1).optional(),
  defaultPricePerSession: z.number().int().nonnegative().optional(),
  currency: z.string().min(3).max(3).optional(),
  schedulePattern: z.unknown().optional().nullable(),
  status: ClassGroupStatusSchema.optional(),
});
export type UpdateClassGroupInput = z.infer<typeof UpdateClassGroupInputSchema>;

export const GetClassGroupOutputSchema = z.object({
  classGroup: ClassGroupSchema,
});
export type GetClassGroupOutput = z.infer<typeof GetClassGroupOutputSchema>;

export const ListClassGroupsInputSchema = ListQuerySchema.extend({
  status: ClassGroupStatusSchema.optional(),
  subject: z.string().optional(),
  level: z.string().optional(),
});
export type ListClassGroupsInput = z.infer<typeof ListClassGroupsInputSchema>;

export const ListClassGroupsOutputSchema = createListResponseSchema(ClassGroupSchema);
export type ListClassGroupsOutput = z.infer<typeof ListClassGroupsOutputSchema>;
