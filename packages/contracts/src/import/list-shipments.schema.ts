import { z } from "zod";
import {
  ImportShipmentDtoSchema,
  ImportShipmentStatusSchema,
  ShippingModeSchema,
} from "./import-shipment.types";

export const ListShipmentsInputSchema = z.object({
  supplierPartyId: z.string().optional(),
  status: ImportShipmentStatusSchema.optional(),
  shippingMode: ShippingModeSchema.optional(),
  estimatedArrivalAfter: z.string().optional(),
  estimatedArrivalBefore: z.string().optional(),
  actualArrivalAfter: z.string().optional(),
  actualArrivalBefore: z.string().optional(),
  containerNumber: z.string().optional(),
  billOfLadingNumber: z.string().optional(),
  limit: z.number().int().positive().max(100).optional(),
  offset: z.number().int().nonnegative().optional(),
});
export type ListShipmentsInput = z.infer<typeof ListShipmentsInputSchema>;

export const ListShipmentsOutputSchema = z.object({
  shipments: z.array(ImportShipmentDtoSchema),
  total: z.number().int().nonnegative(),
});
export type ListShipmentsOutput = z.infer<typeof ListShipmentsOutputSchema>;
