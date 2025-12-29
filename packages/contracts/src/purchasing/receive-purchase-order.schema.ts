import { z } from "zod";
import { PurchaseOrderDtoSchema } from "./purchase-order.types";

export const ReceivePurchaseOrderInputSchema = z.object({
  purchaseOrderId: z.string(),
  idempotencyKey: z.string().optional(),
});

export const ReceivePurchaseOrderOutputSchema = z.object({
  purchaseOrder: PurchaseOrderDtoSchema,
});

export type ReceivePurchaseOrderInput = z.infer<typeof ReceivePurchaseOrderInputSchema>;
export type ReceivePurchaseOrderOutput = z.infer<typeof ReceivePurchaseOrderOutputSchema>;
