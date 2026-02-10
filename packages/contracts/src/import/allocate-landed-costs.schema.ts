import { z } from "zod";
import { ImportShipmentDtoSchema } from "./import-shipment.types";

export const AllocationMethodSchema = z.enum(["BY_WEIGHT", "BY_VOLUME", "BY_FOB_VALUE", "EQUAL"]);
export type AllocationMethod = z.infer<typeof AllocationMethodSchema>;

export const AllocateLandedCostsInputSchema = z.object({
  shipmentId: z.string(),
  allocationMethod: AllocationMethodSchema,
});
export type AllocateLandedCostsInput = z.infer<typeof AllocateLandedCostsInputSchema>;

export const AllocateLandedCostsOutputSchema = z.object({
  shipment: ImportShipmentDtoSchema,
});
export type AllocateLandedCostsOutput = z.infer<typeof AllocateLandedCostsOutputSchema>;
