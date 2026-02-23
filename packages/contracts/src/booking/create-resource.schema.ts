import { z } from "zod";
import { ResourceDtoSchema, ResourceTypeSchema } from "./booking.types";

const QueryBooleanSchema = z.preprocess((value) => {
  if (value === "true") {return true;}
  if (value === "false") {return false;}
  return value;
}, z.boolean());

const QueryNumberSchema = z.preprocess((value) => {
  if (value == null || value === "") {return undefined;}
  if (typeof value === "string") {
    const numeric = Number(value);
    return Number.isNaN(numeric) ? value : numeric;
  }
  return value;
}, z.number().int().positive());

export const CreateResourceInputSchema = z.object({
  type: ResourceTypeSchema,
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional().nullable(),
  location: z.string().max(500).optional().nullable(),
  capacity: z.number().int().positive().optional().nullable(),
  tags: z.array(z.string()).optional(),
  attributes: z.record(z.unknown()).optional().nullable(),
  isActive: z.boolean().default(true),
  idempotencyKey: z.string().optional(),
});
export type CreateResourceInput = z.infer<typeof CreateResourceInputSchema>;

export const UpdateResourceInputSchema = CreateResourceInputSchema.partial().omit({
  idempotencyKey: true,
});
export type UpdateResourceInput = z.infer<typeof UpdateResourceInputSchema>;

export const CreateResourceOutputSchema = z.object({ resource: ResourceDtoSchema });
export type CreateResourceOutput = z.infer<typeof CreateResourceOutputSchema>;

export const ListResourcesInputSchema = z.object({
  q: z.string().optional(),
  page: QueryNumberSchema.optional(),
  pageSize: QueryNumberSchema.optional(),
  sort: z.string().optional(),
  type: ResourceTypeSchema.optional(),
  isActive: QueryBooleanSchema.optional(),
});
export type ListResourcesInput = z.infer<typeof ListResourcesInputSchema>;
