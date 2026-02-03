import { z } from "zod";
import { RentalPropertySchema } from "./rentals.types";

export const ListRentalPropertiesInputSchema = z.object({
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).optional(),
  categoryId: z.string().optional(),
  q: z.string().optional(),
});
export type ListRentalPropertiesInput = z.infer<typeof ListRentalPropertiesInputSchema>;

export const ListPublicRentalPropertiesInputSchema = z.object({
  categorySlug: z.string().optional(),
  q: z.string().optional(),
});
export type ListPublicRentalPropertiesInput = z.infer<typeof ListPublicRentalPropertiesInputSchema>;

export const ListPublicRentalPropertiesOutputSchema = z.array(RentalPropertySchema);
export type ListPublicRentalPropertiesOutput = z.infer<
  typeof ListPublicRentalPropertiesOutputSchema
>;

export const GetPublicRentalPropertyOutputSchema = RentalPropertySchema;
export type GetPublicRentalPropertyOutput = z.infer<typeof GetPublicRentalPropertyOutputSchema>;
