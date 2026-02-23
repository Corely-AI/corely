import { z } from "zod";

export const DirectoryRestaurantStatusSchema = z.enum(["ACTIVE", "HIDDEN"]);
export type DirectoryRestaurantStatus = z.infer<typeof DirectoryRestaurantStatusSchema>;

export const DirectoryLeadStatusSchema = z.enum(["NEW", "CONTACTED", "CLOSED"]);
export type DirectoryLeadStatus = z.infer<typeof DirectoryLeadStatusSchema>;

export const DirectoryPriceRangeSchema = z.enum(["$", "$$", "$$$", "$$$$"]);
export type DirectoryPriceRange = z.infer<typeof DirectoryPriceRangeSchema>;

export const DirectoryOpeningHoursSchema = z.record(z.string(), z.array(z.string()));
export type DirectoryOpeningHours = z.infer<typeof DirectoryOpeningHoursSchema>;

export const DirectoryRestaurantSchema = z.object({
  id: z.string(),
  slug: z.string(),
  name: z.string(),
  shortDescription: z.string().nullable(),
  phone: z.string().nullable(),
  website: z.string().url().nullable(),
  priceRange: DirectoryPriceRangeSchema.nullable(),
  dishTags: z.array(z.string()),
  neighborhoodSlug: z.string().nullable(),
  addressLine: z.string(),
  postalCode: z.string(),
  city: z.string(),
  lat: z.number().nullable(),
  lng: z.number().nullable(),
  openingHours: DirectoryOpeningHoursSchema.nullable(),
  status: DirectoryRestaurantStatusSchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type DirectoryRestaurant = z.infer<typeof DirectoryRestaurantSchema>;
