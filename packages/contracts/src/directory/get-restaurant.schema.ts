import { z } from "zod";
import { DirectoryRestaurantSchema } from "./directory.types";

export const DirectoryRestaurantDetailResponseSchema = z.object({
  restaurant: DirectoryRestaurantSchema,
});
export type DirectoryRestaurantDetailResponse = z.infer<
  typeof DirectoryRestaurantDetailResponseSchema
>;
