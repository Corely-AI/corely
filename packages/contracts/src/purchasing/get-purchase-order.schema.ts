import { z } from "zod";
import { PurchaseOrderDtoSchema } from "./purchase-order.types";

export const GetPurchaseOrderInputSchema = z.object({
  purchaseOrderId: z.string(),
});

export const GetPurchaseOrderOutputSchema = z.object({
  purchaseOrder: PurchaseOrderDtoSchema,
});

export type GetPurchaseOrderInput = z.infer<typeof GetPurchaseOrderInputSchema>;
export type GetPurchaseOrderOutput = z.infer<typeof GetPurchaseOrderOutputSchema>;
