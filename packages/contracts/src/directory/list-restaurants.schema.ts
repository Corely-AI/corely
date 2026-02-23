import { z } from "zod";
import { createListResponseSchema } from "../common/list.contract";
import { DirectoryRestaurantSchema } from "./directory.types";

export const DirectoryRestaurantListQuerySchema = z.object({
  q: z.string().trim().min(1).optional(),
  neighborhood: z.string().trim().min(1).optional(),
  dish: z.string().trim().min(1).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
export type DirectoryRestaurantListQuery = z.infer<typeof DirectoryRestaurantListQuerySchema>;

export const DirectoryRestaurantListItemSchema = DirectoryRestaurantSchema.pick({
  id: true,
  slug: true,
  name: true,
  shortDescription: true,
  dishTags: true,
  neighborhoodSlug: true,
  addressLine: true,
  postalCode: true,
  city: true,
  priceRange: true,
  status: true,
});
export type DirectoryRestaurantListItem = z.infer<typeof DirectoryRestaurantListItemSchema>;

export const DirectoryRestaurantListResponseSchema = createListResponseSchema(
  DirectoryRestaurantListItemSchema
);
export type DirectoryRestaurantListResponse = z.infer<typeof DirectoryRestaurantListResponseSchema>;
