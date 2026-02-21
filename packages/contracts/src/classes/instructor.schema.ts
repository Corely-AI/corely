import { z } from "zod";
import { ClassGroupInstructorRoleSchema, ClassGroupInstructorSchema } from "./classes.types";

export const ClassGroupInstructorInputSchema = z.object({
  partyId: z.string(),
  role: ClassGroupInstructorRoleSchema,
});
export type ClassGroupInstructorInput = z.infer<typeof ClassGroupInstructorInputSchema>;

export const UpsertClassGroupInstructorsInputSchema = z.object({
  members: z.array(ClassGroupInstructorInputSchema),
  idempotencyKey: z.string().optional(),
});
export type UpsertClassGroupInstructorsInput = z.infer<
  typeof UpsertClassGroupInstructorsInputSchema
>;

export const ClassGroupInstructorsOutputSchema = z.object({
  items: z.array(ClassGroupInstructorSchema),
});
export type ClassGroupInstructorsOutput = z.infer<typeof ClassGroupInstructorsOutputSchema>;
