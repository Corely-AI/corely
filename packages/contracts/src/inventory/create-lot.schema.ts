import { z } from "zod";
import { localDateSchema } from "../shared/local-date.schema";
import { InventoryLotDtoSchema, InventoryLotStatusSchema } from "./inventory.types";

export const CreateLotInputSchema = z.object({
  productId: z.string().min(1, "Product ID is required"),
  lotNumber: z.string().min(1, "Lot number is required"),
  mfgDate: localDateSchema.nullable().optional(),
  expiryDate: localDateSchema.nullable().optional(),
  receivedDate: localDateSchema,
  shipmentId: z.string().nullable().optional(),
  supplierPartyId: z.string().nullable().optional(),
  unitCostCents: z.number().int().nonnegative().nullable().optional(),
  qtyReceived: z.number().positive("Quantity received must be positive"),
  status: InventoryLotStatusSchema.optional(),
  notes: z.string().nullable().optional(),
  metadataJson: z.record(z.any()).nullable().optional(),
});

export const CreateLotOutputSchema = z.object({
  lot: InventoryLotDtoSchema,
});

export type CreateLotInput = z.infer<typeof CreateLotInputSchema>;
export type CreateLotOutput = z.infer<typeof CreateLotOutputSchema>;
