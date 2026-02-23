import { z } from "zod";
import { createListResponseSchema } from "../common/list.contract";
import { DirectoryRestaurantStatusSchema } from "../directory/directory.types";
import { AdminDirectoryRestaurantSchema } from "./directory-admin.types";

export const AdminDirectoryRestaurantSortSchema = z.enum([
  "updatedAt:desc",
  "updatedAt:asc",
  "createdAt:desc",
  "createdAt:asc",
  "name:asc",
  "name:desc",
]);
export type AdminDirectoryRestaurantSort = z.infer<typeof AdminDirectoryRestaurantSortSchema>;

export const AdminDirectoryRestaurantListQuerySchema = z.object({
  q: z.string().trim().min(1).optional(),
  status: DirectoryRestaurantStatusSchema.optional(),
  neighborhood: z.string().trim().min(1).optional(),
  dish: z.string().trim().min(1).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  sort: AdminDirectoryRestaurantSortSchema.optional(),
});
export type AdminDirectoryRestaurantListQuery = z.infer<
  typeof AdminDirectoryRestaurantListQuerySchema
>;

export const AdminDirectoryRestaurantListItemSchema = AdminDirectoryRestaurantSchema.pick({
  id: true,
  slug: true,
  name: true,
  dishTags: true,
  neighborhoodSlug: true,
  status: true,
  updatedAt: true,
});
export type AdminDirectoryRestaurantListItem = z.infer<
  typeof AdminDirectoryRestaurantListItemSchema
>;

export const AdminDirectoryRestaurantListResponseSchema = createListResponseSchema(
  AdminDirectoryRestaurantListItemSchema
);
export type AdminDirectoryRestaurantListResponse = z.infer<
  typeof AdminDirectoryRestaurantListResponseSchema
>;
