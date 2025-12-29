import { z } from "zod";
import { PurchaseOrderDtoSchema } from "./purchase-order.types";

export const SendPurchaseOrderInputSchema = z.object({
  purchaseOrderId: z.string(),
  idempotencyKey: z.string().optional(),
});

export const SendPurchaseOrderOutputSchema = z.object({
  purchaseOrder: PurchaseOrderDtoSchema,
});

export type SendPurchaseOrderInput = z.infer<typeof SendPurchaseOrderInputSchema>;
export type SendPurchaseOrderOutput = z.infer<typeof SendPurchaseOrderOutputSchema>;
