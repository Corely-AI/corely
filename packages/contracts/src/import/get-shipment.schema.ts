import { z } from "zod";
import { ImportShipmentDtoSchema } from "./import-shipment.types";

export const GetShipmentInputSchema = z.object({
  shipmentId: z.string(),
});
export type GetShipmentInput = z.infer<typeof GetShipmentInputSchema>;

export const GetShipmentOutputSchema = z.object({
  shipment: ImportShipmentDtoSchema,
});
export type GetShipmentOutput = z.infer<typeof GetShipmentOutputSchema>;
