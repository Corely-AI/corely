import { z } from "zod";
import { AdminDirectoryRestaurantSchema } from "./directory-admin.types";

export const AdminDirectoryRestaurantIdParamSchema = z.object({
  id: z.string().trim().min(1),
});
export type AdminDirectoryRestaurantIdParam = z.infer<typeof AdminDirectoryRestaurantIdParamSchema>;

export const AdminDirectoryRestaurantDetailResponseSchema = z.object({
  restaurant: AdminDirectoryRestaurantSchema,
});
export type AdminDirectoryRestaurantDetailResponse = z.infer<
  typeof AdminDirectoryRestaurantDetailResponseSchema
>;
