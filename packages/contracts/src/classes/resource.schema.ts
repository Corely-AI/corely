import { z } from "zod";
import {
  ClassGroupResourceSchema,
  ClassResourceTypeSchema,
  ClassResourceVisibilitySchema,
} from "./classes.types";

export const CreateClassGroupResourceInputSchema = z.object({
  type: ClassResourceTypeSchema,
  title: z.string().min(1),
  documentId: z.string().optional().nullable(),
  url: z.string().url().optional().nullable(),
  visibility: ClassResourceVisibilitySchema.optional(),
  sortOrder: z.number().int().nonnegative().optional(),
  idempotencyKey: z.string().optional(),
});
export type CreateClassGroupResourceInput = z.infer<typeof CreateClassGroupResourceInputSchema>;

export const UpdateClassGroupResourceInputSchema = z.object({
  type: ClassResourceTypeSchema.optional(),
  title: z.string().min(1).optional(),
  documentId: z.string().optional().nullable(),
  url: z.string().url().optional().nullable(),
  visibility: ClassResourceVisibilitySchema.optional(),
  sortOrder: z.number().int().nonnegative().optional(),
});
export type UpdateClassGroupResourceInput = z.infer<typeof UpdateClassGroupResourceInputSchema>;

export const ReorderClassGroupResourcesInputSchema = z.object({
  orderedIds: z.array(z.string()).min(1),
});
export type ReorderClassGroupResourcesInput = z.infer<typeof ReorderClassGroupResourcesInputSchema>;

export const ListClassGroupResourcesOutputSchema = z.object({
  items: z.array(ClassGroupResourceSchema),
});
export type ListClassGroupResourcesOutput = z.infer<typeof ListClassGroupResourcesOutputSchema>;
