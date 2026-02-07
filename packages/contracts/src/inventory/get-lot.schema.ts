import { z } from "zod";
import { InventoryLotDtoSchema } from "./inventory.types";

export const GetLotInputSchema = z.object({
  id: z.string().min(1, "Lot ID is required"),
});

export const GetLotOutputSchema = z.object({
  lot: InventoryLotDtoSchema,
});

export type GetLotInput = z.infer<typeof GetLotInputSchema>;
export type GetLotOutput = z.infer<typeof GetLotOutputSchema>;
