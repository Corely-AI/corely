import { z } from "zod";
import { CreateRentalPropertyInputSchema } from "./create-property.schema";

import { RentalStatusSchema } from "./rentals.types";

export const UpdateRentalPropertyInputSchema = CreateRentalPropertyInputSchema.partial().extend({
  id: z.string(),
  status: RentalStatusSchema.optional(),
});
export type UpdateRentalPropertyInput = z.infer<typeof UpdateRentalPropertyInputSchema>;

export const AssignPropertyCategoriesInputSchema = z.object({
  categoryIds: z.array(z.string()),
});
export type AssignPropertyCategoriesInput = z.infer<typeof AssignPropertyCategoriesInputSchema>;
