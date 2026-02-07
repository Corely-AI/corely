import { z } from "zod";
import { localDateSchema } from "../shared/local-date.schema";
import { InventoryLotDtoSchema, InventoryLotStatusSchema } from "./inventory.types";

export const ListLotsInputSchema = z.object({
  productId: z.string().optional(),
  status: InventoryLotStatusSchema.optional(),
  expiryBefore: localDateSchema.optional(),
  expiryAfter: localDateSchema.optional(),
  shipmentId: z.string().optional(),
  supplierPartyId: z.string().optional(),
  qtyOnHandGt: z.number().optional(), // Greater than
  limit: z.number().int().positive().max(1000).optional().default(100),
  offset: z.number().int().nonnegative().optional().default(0),
});

export const ListLotsOutputSchema = z.object({
  lots: z.array(InventoryLotDtoSchema),
  total: z.number().int().nonnegative(),
});

export type ListLotsInput = z.infer<typeof ListLotsInputSchema>;
export type ListLotsOutput = z.infer<typeof ListLotsOutputSchema>;
