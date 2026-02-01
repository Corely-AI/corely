import { z } from "zod";

export const RentalStatusSchema = z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]);
export type RentalStatus = z.infer<typeof RentalStatusSchema>;

export const AvailabilityStatusSchema = z.enum(["AVAILABLE", "BLOCKED"]);
export type AvailabilityStatus = z.infer<typeof AvailabilityStatusSchema>;

export const RentalPropertyImageSchema = z.object({
  id: z.string(),
  fileId: z.string(),
  altText: z.string().nullable(),
  sortOrder: z.number(),
});
export type RentalPropertyImage = z.infer<typeof RentalPropertyImageSchema>;

export const RentalCategorySchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
});
export type RentalCategory = z.infer<typeof RentalCategorySchema>;

export const RentalPropertySchema = z.object({
  id: z.string(),
  status: RentalStatusSchema,
  slug: z.string(),
  name: z.string(),
  summary: z.string().nullable(),
  descriptionHtml: z.string().nullable(),
  maxGuests: z.number().nullable(),
  coverImageFileId: z.string().nullable(),
  images: z.array(RentalPropertyImageSchema),
  categories: z.array(RentalCategorySchema).optional(),
  publishedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type RentalProperty = z.infer<typeof RentalPropertySchema>;

export const RentalAvailabilityRangeSchema = z.object({
  id: z.string(),
  startDate: z.string(), // ISO Date
  endDate: z.string(), // ISO Date
  status: AvailabilityStatusSchema,
  note: z.string().nullable(),
});
export type RentalAvailabilityRange = z.infer<typeof RentalAvailabilityRangeSchema>;
