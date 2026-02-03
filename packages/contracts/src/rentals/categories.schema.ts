import { z } from "zod";
import { RentalCategorySchema } from "./rentals.types";

export const CreateRentalCategoryInputSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1),
});
export type CreateRentalCategoryInput = z.infer<typeof CreateRentalCategoryInputSchema>;

export const UpdateRentalCategoryInputSchema = CreateRentalCategoryInputSchema.extend({
  id: z.string(),
});
export type UpdateRentalCategoryInput = z.infer<typeof UpdateRentalCategoryInputSchema>;

export const ListRentalCategoriesOutputSchema = z.array(RentalCategorySchema);
export type ListRentalCategoriesOutput = z.infer<typeof ListRentalCategoriesOutputSchema>;
