import { z } from "zod";
import {
  AdminDirectoryRestaurantSchema,
  SetRestaurantStatusRequestSchema,
  UpdateAdminDirectoryRestaurantRequestSchema,
} from "./directory-admin.types";

export { UpdateAdminDirectoryRestaurantRequestSchema, SetRestaurantStatusRequestSchema };
export type {
  UpdateAdminDirectoryRestaurantRequest,
  SetRestaurantStatusRequest,
} from "./directory-admin.types";

export const UpdateAdminDirectoryRestaurantResponseSchema = z.object({
  restaurant: AdminDirectoryRestaurantSchema,
});
export type UpdateAdminDirectoryRestaurantResponse = z.infer<
  typeof UpdateAdminDirectoryRestaurantResponseSchema
>;

export const SetRestaurantStatusResponseSchema = z.object({
  restaurant: AdminDirectoryRestaurantSchema,
});
export type SetRestaurantStatusResponse = z.infer<typeof SetRestaurantStatusResponseSchema>;
