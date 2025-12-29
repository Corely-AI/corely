import { z } from "zod";
import { PurchaseOrderDtoSchema } from "./purchase-order.types";

export const CancelPurchaseOrderInputSchema = z.object({
  purchaseOrderId: z.string(),
  idempotencyKey: z.string().optional(),
});

export const CancelPurchaseOrderOutputSchema = z.object({
  purchaseOrder: PurchaseOrderDtoSchema,
});

export type CancelPurchaseOrderInput = z.infer<typeof CancelPurchaseOrderInputSchema>;
export type CancelPurchaseOrderOutput = z.infer<typeof CancelPurchaseOrderOutputSchema>;
