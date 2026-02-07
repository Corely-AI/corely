import { z } from "zod";
import { localDateSchema } from "../shared/local-date.schema";
import { ImportShipmentDtoSchema } from "./import-shipment.types";

export const ReceiveShipmentLineInputSchema = z.object({
  lineId: z.string(),
  receivedQty: z.number().int().nonnegative(),
  lotNumber: z.string().optional(),
  mfgDate: localDateSchema.nullable().optional(),
  expiryDate: localDateSchema.nullable().optional(),
  locationId: z.string(),
});

export const ReceiveShipmentInputSchema = z.object({
  shipmentId: z.string(),
  receivedDate: localDateSchema,
  warehouseId: z.string(),
  lines: z.array(ReceiveShipmentLineInputSchema).min(1),
  notes: z.string().nullable().optional(),
});
export type ReceiveShipmentInput = z.infer<typeof ReceiveShipmentInputSchema>;

export const ReceiveShipmentOutputSchema = z.object({
  shipment: ImportShipmentDtoSchema,
  receiptDocumentId: z.string(), // Created InventoryDocument ID
});
export type ReceiveShipmentOutput = z.infer<typeof ReceiveShipmentOutputSchema>;
