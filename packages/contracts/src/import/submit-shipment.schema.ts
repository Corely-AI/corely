import { z } from "zod";
import { ImportShipmentDtoSchema } from "./import-shipment.types";

export const SubmitShipmentInputSchema = z.object({
  shipmentId: z.string(),
});
export type SubmitShipmentInput = z.infer<typeof SubmitShipmentInputSchema>;

export const SubmitShipmentOutputSchema = z.object({
  shipment: ImportShipmentDtoSchema,
});
export type SubmitShipmentOutput = z.infer<typeof SubmitShipmentOutputSchema>;
