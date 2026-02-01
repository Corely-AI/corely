import { z } from "zod";

export const CreateRentalCategoryInputSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1),
});
export type CreateRentalCategoryInput = z.infer<typeof CreateRentalCategoryInputSchema>;

export const UpdateRentalCategoryInputSchema = CreateRentalCategoryInputSchema.extend({
  id: z.string(),
});
export type UpdateRentalCategoryInput = z.infer<typeof UpdateRentalCategoryInputSchema>;
