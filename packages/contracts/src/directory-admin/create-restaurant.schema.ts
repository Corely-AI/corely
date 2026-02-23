import { z } from "zod";
import {
  AdminDirectoryRestaurantSchema,
  CreateAdminDirectoryRestaurantRequestSchema,
} from "./directory-admin.types";

export { CreateAdminDirectoryRestaurantRequestSchema };
export type { CreateAdminDirectoryRestaurantRequest } from "./directory-admin.types";

export const CreateAdminDirectoryRestaurantResponseSchema = z.object({
  restaurant: AdminDirectoryRestaurantSchema,
});
export type CreateAdminDirectoryRestaurantResponse = z.infer<
  typeof CreateAdminDirectoryRestaurantResponseSchema
>;
