import { z } from "zod";
import {
  DirectoryOpeningHoursSchema,
  DirectoryPriceRangeSchema,
  DirectoryRestaurantStatusSchema,
} from "../directory/directory.types";

export const DirectorySlugSchema = z
  .string()
  .trim()
  .min(1)
  .max(120)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

export const DirectoryDishTagSchema = z
  .string()
  .trim()
  .min(1)
  .max(60)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

const OptionalNullableTextSchema = z.string().trim().min(1).max(300).nullable().optional();
const OptionalNullableUrlSchema = z.string().trim().url().nullable().optional();

export const AdminDirectoryRestaurantSchema = z.object({
  id: z.string(),
  slug: DirectorySlugSchema,
  name: z.string().trim().min(1).max(200),
  shortDescription: z.string().nullable(),
  phone: z.string().nullable(),
  website: z.string().url().nullable(),
  priceRange: DirectoryPriceRangeSchema.nullable(),
  dishTags: z.array(DirectoryDishTagSchema),
  neighborhoodSlug: z.string().nullable(),
  addressLine: z.string(),
  postalCode: z.string(),
  city: z.string(),
  lat: z.number().nullable(),
  lng: z.number().nullable(),
  openingHoursJson: DirectoryOpeningHoursSchema.nullable(),
  status: DirectoryRestaurantStatusSchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type AdminDirectoryRestaurant = z.infer<typeof AdminDirectoryRestaurantSchema>;

export const CreateAdminDirectoryRestaurantRequestSchema = z.object({
  name: z.string().trim().min(1).max(200),
  slug: DirectorySlugSchema,
  shortDescription: OptionalNullableTextSchema,
  phone: z.string().trim().min(1).max(120).nullable().optional(),
  website: OptionalNullableUrlSchema,
  priceRange: DirectoryPriceRangeSchema.nullable().optional(),
  dishTags: z.array(DirectoryDishTagSchema),
  neighborhoodSlug: DirectorySlugSchema.nullable().optional(),
  addressLine: z.string().trim().min(1).max(300),
  postalCode: z.string().trim().min(1).max(24),
  city: z.string().trim().min(1).max(120).default("Berlin"),
  lat: z.number().min(-90).max(90).nullable().optional(),
  lng: z.number().min(-180).max(180).nullable().optional(),
  openingHoursJson: DirectoryOpeningHoursSchema.nullable().optional(),
  status: DirectoryRestaurantStatusSchema.default("HIDDEN"),
});
export type CreateAdminDirectoryRestaurantRequest = z.infer<
  typeof CreateAdminDirectoryRestaurantRequestSchema
>;

export const UpdateAdminDirectoryRestaurantRequestSchema =
  CreateAdminDirectoryRestaurantRequestSchema.partial().refine(
    (value) => Object.keys(value).length > 0,
    {
      message: "At least one field must be provided",
    }
  );
export type UpdateAdminDirectoryRestaurantRequest = z.infer<
  typeof UpdateAdminDirectoryRestaurantRequestSchema
>;

export const SetRestaurantStatusRequestSchema = z.object({
  status: DirectoryRestaurantStatusSchema,
});
export type SetRestaurantStatusRequest = z.infer<typeof SetRestaurantStatusRequestSchema>;
