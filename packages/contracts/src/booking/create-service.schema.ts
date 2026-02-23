import { z } from "zod";
import { ServiceOfferingDtoSchema, ResourceTypeSchema } from "./booking.types";

const QueryBooleanSchema = z.preprocess((value) => {
  if (value === "true") {
    return true;
  }
  if (value === "false") {
    return false;
  }
  return value;
}, z.boolean());

const QueryNumberSchema = z.preprocess((value) => {
  if (value == null || value === "") {
    return undefined;
  }
  if (typeof value === "string") {
    const numeric = Number(value);
    return Number.isNaN(numeric) ? value : numeric;
  }
  return value;
}, z.number().int().positive());

export const CreateServiceOfferingInputSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional().nullable(),
  durationMinutes: z.number().int().positive(),
  bufferBeforeMinutes: z.number().int().nonnegative().default(0),
  bufferAfterMinutes: z.number().int().nonnegative().default(0),
  priceCents: z.number().int().nonnegative().optional().nullable(),
  currency: z.string().optional().nullable(),
  depositCents: z.number().int().nonnegative().optional().nullable(),
  requiredResourceTypes: z.array(ResourceTypeSchema).optional(),
  requiredTags: z.array(z.string()).optional(),
  isActive: z.boolean().default(true),
  idempotencyKey: z.string().optional(),
});
export type CreateServiceOfferingInput = z.infer<typeof CreateServiceOfferingInputSchema>;

export const UpdateServiceOfferingInputSchema = CreateServiceOfferingInputSchema.partial().omit({
  idempotencyKey: true,
});
export type UpdateServiceOfferingInput = z.infer<typeof UpdateServiceOfferingInputSchema>;

export const CreateServiceOfferingOutputSchema = z.object({
  service: ServiceOfferingDtoSchema,
});
export type CreateServiceOfferingOutput = z.infer<typeof CreateServiceOfferingOutputSchema>;

export const ListServiceOfferingsInputSchema = z.object({
  q: z.string().optional(),
  page: QueryNumberSchema.optional(),
  pageSize: QueryNumberSchema.optional(),
  sort: z.string().optional(),
  isActive: QueryBooleanSchema.optional(),
});
export type ListServiceOfferingsInput = z.infer<typeof ListServiceOfferingsInputSchema>;
