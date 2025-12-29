import { z } from "zod";
import { PurchaseOrderDtoSchema } from "./purchase-order.types";

export const ClosePurchaseOrderInputSchema = z.object({
  purchaseOrderId: z.string(),
  idempotencyKey: z.string().optional(),
});

export const ClosePurchaseOrderOutputSchema = z.object({
  purchaseOrder: PurchaseOrderDtoSchema,
});

export type ClosePurchaseOrderInput = z.infer<typeof ClosePurchaseOrderInputSchema>;
export type ClosePurchaseOrderOutput = z.infer<typeof ClosePurchaseOrderOutputSchema>;
