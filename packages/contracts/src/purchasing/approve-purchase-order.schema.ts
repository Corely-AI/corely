import { z } from "zod";
import { PurchaseOrderDtoSchema } from "./purchase-order.types";

export const ApprovePurchaseOrderInputSchema = z.object({
  purchaseOrderId: z.string(),
  idempotencyKey: z.string().optional(),
});

export const ApprovePurchaseOrderOutputSchema = z.object({
  purchaseOrder: PurchaseOrderDtoSchema,
});

export type ApprovePurchaseOrderInput = z.infer<typeof ApprovePurchaseOrderInputSchema>;
export type ApprovePurchaseOrderOutput = z.infer<typeof ApprovePurchaseOrderOutputSchema>;
